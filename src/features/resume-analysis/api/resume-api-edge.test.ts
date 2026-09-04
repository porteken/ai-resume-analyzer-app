import {
  pollForResults,
  prefetchResumeUpload,
  uploadResume,
} from "@/features/resume-analysis/api/resume-api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PrefetchedUpload } from "@/features/resume-analysis/api/resume-api";
import type { Mock } from "vitest";

const createFetchMock = () => vi.fn<typeof fetch>();

const jsonResponse = (
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): Response => Response.json(data, { headers, status });

const presignedPayload = (jobId = "job-123") => ({
  job_id: jobId,
  s3_url: `s3://bucket/${jobId}/resume.pdf`,
  upload: {
    fields: { key: `uploads/${jobId}/resume.pdf`, policy: "p" },
    url: "https://bucket.s3.amazonaws.com",
  },
});

const pdfFile = () =>
  new File(["pdf-content"], "resume.pdf", { type: "application/pdf" });

const noOpProgress = () => {};

describe("resume-api error mapping and retry-after", () => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach(() => {
    fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("maps 429 with retry-after plural seconds", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-429")))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(429, {}, { "retry-after": "5" }));

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Too many requests. Please try again in 5 seconds.",
    );
  });

  it("maps 429 with retry-after singular second", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-429-1")))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(429, {}, { "retry-after": "1" }));

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Too many requests. Please try again in 1 second.",
    );
  });

  it("maps 429 without retry-after to generic message", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-429-0")))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(429, {}));

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Too many requests. Please wait a moment and try again.",
    );
  });

  it("maps 429 with invalid retry-after to generic message", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-429-bad")))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse(429, {}, { "retry-after": "not-a-number" }),
      );

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Too many requests. Please wait a moment and try again.",
    );
  });

  it("falls back to generic message for 503 without ServiceUnavailable type", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-503x")))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse(503, { error: "Overloaded", type: "Other" }),
      );

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Overloaded",
    );
  });

  it("joins error and details with space when error ends with period", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        details: "field missing",
        error: "Invalid input.",
      }),
    );

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Invalid input. field missing",
    );
  });

  it("joins error and details with colon when no trailing punctuation", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { details: "field missing", error: "Invalid input" }),
    );

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Invalid input: field missing",
    );
  });

  it("throws upload failed with status when error payload is empty", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, {}));

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "POST /api/upload failed with status 400",
    );
  });

  it("throws generic Error message when ApiClient payload has message only", async () => {
    // ApiClientError message comes from payload.message; resume-api falls back
    // to error.message when no error/details/status mapping matches.
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { message: "Custom upstream boom" }),
    );

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Custom upstream boom",
    );
  });

  it("wraps non-ApiClient upload errors with fallback", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom-network"));

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "boom-network",
    );
  });

  it("throws unexpected payload for non-object upload json", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, "just-a-string"));

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Unexpected response from upload endpoint.",
    );
  });

  it("uses legacy direct analysis_result without presigned flow", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { analysis_result: { score: 9 } }),
    );

    const result = await uploadResume(pdfFile(), "Engineer");
    expect(result).toStrictEqual({ analysis_result: { score: 9 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws S3 MetadataTooLarge as friendly message", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-meta")))
      .mockResolvedValueOnce(
        new Response("MetadataTooLarge: headers too big", { status: 400 }),
      );

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "File metadata is too large",
    );
  });

  it("throws S3 generic failure with status text", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-s3fail")))
      .mockResolvedValueOnce(
        new Response("oops", { status: 500, statusText: "Server Error" }),
      );

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "S3 upload failed: 500",
    );
  });

  it("matches lowercase metadata headers exceed from S3", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-meta2")))
      .mockResolvedValueOnce(
        new Response("metadata headers exceed limits", { status: 400 }),
      );

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "File metadata is too large",
    );
  });

  it("propagates abort during S3 upload", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, presignedPayload()));

    await expect(
      uploadResume(pdfFile(), "Engineer", noOpProgress, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("throws when legacy fallback error is not pdf_base64 related", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: "Totally unrelated validation" }),
    );

    await expect(uploadResume(pdfFile(), "Engineer")).rejects.toThrow(
      "Totally unrelated validation",
    );
  });

  it("prefetch returns jobId and s3Url", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-pre")))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await prefetchResumeUpload(pdfFile());
    expect(result.jobId).toBe("job-pre");
    expect(result.s3Url).toContain("s3://bucket/");
  });

  it("prefetch throws on unexpected payload", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { nope: true }));

    await expect(prefetchResumeUpload(pdfFile())).rejects.toThrow(
      "Unexpected response from upload endpoint.",
    );
  });

  it("uploadResume uses prefetched result when available", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-pf")))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse(200, { analysis_result: "prefetched-done" }),
      );

    const file = pdfFile();
    const prefetched = prefetchResumeUpload(file);
    const result = await uploadResume(file, "Engineer", noOpProgress, {
      prefetched,
    });

    expect(result).toStrictEqual({
      analysis_result: "prefetched-done",
      job_id: "job-pf",
    });
  });

  it("uploadResume falls back to normal flow when prefetch fails", async () => {
    const failingPrefetch = Promise.reject(new Error("prefetch boom"));
    // Suppress unhandled rejection warning path (tryPrefetchedUpload catches).
    failingPrefetch.catch(() => {});
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { analysis_result: "direct" }),
    );

    const result = await uploadResume(pdfFile(), "Engineer", noOpProgress, {
      prefetched: failingPrefetch as unknown as Promise<PrefetchedUpload>,
    });

    expect(result).toStrictEqual({ analysis_result: "direct" });
  });

  it("uploadResume propagates abort from prefetched promise", async () => {
    const controller = new AbortController();
    const neverResolves = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener("abort", () => {
        const error = new DOMException("Request was aborted.", "AbortError");
        reject(error);
      });
    });
    neverResolves.catch(() => {});
    controller.abort();

    await expect(
      uploadResume(pdfFile(), "Engineer", noOpProgress, {
        prefetched: neverResolves as unknown as Promise<PrefetchedUpload>,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("includes turnstileToken in upload and analyze payloads", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-ts")))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(200, { status: "ok" }));

    await uploadResume(pdfFile(), "Engineer", noOpProgress, {
      turnstileToken: "ts-123",
    });

    const firstBody = JSON.parse(
      (() => {
        const [, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
        return firstInit.body as string;
      })(),
    ) as Record<string, unknown>;
    expect(firstBody.turnstileToken).toBe("ts-123");
    const thirdBody = JSON.parse(
      (() => {
        const [, thirdInit] = fetchMock.mock.calls[2] as [string, RequestInit];
        return thirdInit.body as string;
      })(),
    ) as Record<string, unknown>;
    expect(thirdBody.turnstileToken).toBe("ts-123");
  });

  it("triggerAnalysis returns null for non-JSON content-type", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, presignedPayload("job-nj")))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response("<html>ok</html>", {
          headers: { "content-type": "text/html" },
          status: 200,
        }),
      );

    const result = await uploadResume(pdfFile(), "Engineer");
    expect(result).toStrictEqual({ job_id: "job-nj" });
  });
});

describe("resume-api polling edge cases", () => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach(() => {
    fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("throws failed status error with server message", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { error: "Model crashed", status: "failed" }),
    );

    const promise = pollForResults("job-1", noOpProgress);
    await Promise.all([
      vi.advanceTimersByTimeAsync(1000),
      expect(promise).rejects.toThrow("Model crashed"),
    ]);
  });

  it("throws generic failed message when error missing", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "failed" }));

    const promise = pollForResults("job-1", noOpProgress);
    await Promise.all([
      vi.advanceTimersByTimeAsync(1000),
      expect(promise).rejects.toThrow("Analysis failed on server."),
    ]);
  });

  it("returns string analysis_result immediately without completed status", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { analysis_result: "inline-result" }),
    );

    const promise = pollForResults("job-1", noOpProgress);
    await Promise.all([
      vi.advanceTimersByTimeAsync(1000),
      expect(promise).resolves.toBe("inline-result"),
    ]);
  });

  it("throws when completed status has no result", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "completed" }));

    const promise = pollForResults("job-1", noOpProgress);
    await Promise.all([
      vi.advanceTimersByTimeAsync(1000),
      expect(promise).rejects.toThrow(
        "Analysis completed, but no result was returned.",
      ),
    ]);
  });

  it("throws timeout after max attempts", async () => {
    vi.useFakeTimers();
    // Every poll returns processing; use fewer real timers by rejecting early:
    // pollForResults always uses 60 attempts, but we can simulate timeout by
    // making first call hang until timers exceed. Instead directly test the
    // timeout branch by advancing through all attempts quickly.
    fetchMock.mockImplementation(async () =>
      jsonResponse(200, { status: "processing" }),
    );

    const promise = pollForResults("job-1", () => {});
    // Total delay: 1s + 1.5s + 2s + 4s + 8s + 16s + 30s*54 ≈ 1.6M ms.
    // Advance in large steps.
    const advance = (async () => {
      for (let index = 0; index < 70; index += 1) {
        await vi.advanceTimersByTimeAsync(60_000);
      }
    })();
    await expect(Promise.all([advance, promise])).rejects.toThrow(
      "Request timed out.",
    );
    vi.useRealTimers();
  }, 20_000);

  it("uses exponential backoff capped at 30s for later attempts", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { status: "processing" }))
      .mockResolvedValueOnce(jsonResponse(200, { status: "processing" }))
      .mockResolvedValueOnce(jsonResponse(200, { status: "processing" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          analysis_result: "late-result",
          status: "completed",
        }),
      );

    const onProgress = vi.fn<(message: string) => void>();
    const promise = pollForResults("job-1", onProgress);

    // Total for attempts 1-4: 1s + 1.5s + 2s + 4s = 8.5s
    await vi.advanceTimersByTimeAsync(9000);
    await expect(promise).resolves.toBe("late-result");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("maps status endpoint ApiClientError with status prefix", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(jsonResponse(500, {}));

    const promise = pollForResults("job-1", noOpProgress);
    promise.catch(() => {});
    await Promise.all([
      vi.advanceTimersByTimeAsync(1000),
      expect(promise).rejects.toThrow(
        "GET /api/status/job-1 failed with status 500",
      ),
    ]);
  });

  it("supports aborting polling mid-flight via signal event", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((_resolve, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new DOMException("Request was aborted.", "AbortError"));
          });
        }),
    );

    const promise = pollForResults("job-1", noOpProgress, {
      signal: controller.signal,
    });
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();
    await expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
