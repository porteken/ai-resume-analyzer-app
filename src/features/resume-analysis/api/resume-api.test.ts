import {
  pollForResults,
  uploadResume,
} from "@/features/resume-analysis/api/resume-api";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";

import type { Mock } from "vitest";

const createFetchMock = () => vi.fn<typeof fetch>();

const createJsonResponse = (status: number, data: unknown): Response => {
  if (status === 204) {
    return new Response(null, { status });
  }
  return Response.json(data, { status });
};

const createOpaqueResponse = (): Response => {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "type", { value: "opaque" });
  return response;
};

const parseRequestJsonBody = (request: RequestInit | undefined): any => {
  const body = request?.body;

  if (typeof body !== "string") {
    throw new TypeError("Expected request body to be a JSON string");
  }

  return JSON.parse(body);
};

describe("resume upload API", () => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach(() => {
    fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses presigned upload flow and triggers analysis", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          job_id: "job-123",
          s3_url: "s3://bucket/uploads/job-123/resume.pdf",
          upload: {
            fields: {
              "Content-Type": "application/pdf",
              key: "uploads/job-123/resume.pdf",
              policy: "policy",
              signature: "signature",
              "x-amz-meta-filename": "resume.pdf",
              "x-amz-meta-job_id": "job-123",
            },
            url: "https://bucket.s3.amazonaws.com",
          },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(204, {}))
      .mockResolvedValueOnce(createJsonResponse(200, { status: "ok" }));

    const file = new File(["pdf-content"], "resume.pdf", {
      type: "application/pdf",
    });
    const result = await uploadResume(file, "Senior software engineer");

    expect(result).toStrictEqual({ job_id: "job-123" });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) {
      throw new Error("Missing first call");
    }
    const firstRequest = firstCall[1];
    const firstPayload: {
      filename: string;
      job_description: string;
    } = parseRequestJsonBody(firstRequest);
    expect(firstPayload.filename).toBe("resume.pdf");
    expect(firstPayload.job_description).toBe("Senior software engineer");

    const thirdCall = fetchMock.mock.calls[2];
    if (!thirdCall) {
      throw new Error("Missing third call");
    }
    const thirdRequest = thirdCall[1];
    const thirdPayload: {
      job_description: string;
      job_id: string;
      s3_url: string;
    } = parseRequestJsonBody(thirdRequest);
    expect(thirdPayload.job_id).toBe("job-123");
    expect(thirdPayload.s3_url).toContain("s3://bucket/");
    expect(thirdPayload.job_description).toBe("Senior software engineer");
  });

  it("treats opaque S3 upload responses as success for cross-origin presigned uploads", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          job_id: "job-opaque",
          s3_url: "s3://bucket/uploads/job-opaque/resume.pdf",
          upload: {
            fields: {
              "Content-Type": "application/pdf",
              key: "uploads/job-opaque/resume.pdf",
              policy: "policy",
              signature: "signature",
              "x-amz-meta-filename": "resume.pdf",
              "x-amz-meta-job_id": "job-opaque",
            },
            url: "https://bucket.s3.amazonaws.com",
          },
        }),
      )
      .mockResolvedValueOnce(createOpaqueResponse())
      .mockResolvedValueOnce(createJsonResponse(200, { status: "ok" }));

    const file = new File(["pdf-content"], "resume.pdf", {
      type: "application/pdf",
    });
    const result = await uploadResume(file, "Senior software engineer");

    expect(result).toStrictEqual({ job_id: "job-opaque" });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const secondCall = fetchMock.mock.calls[1];
    if (!secondCall) {
      throw new Error("Missing second call");
    }
    const secondRequest = secondCall[1];
    expect(secondRequest?.mode).toBe("no-cors");
  });

  it("falls back to legacy pdf_base64 payload when required by backend", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(400, {
          error: "Missing required field: pdf_base64",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, { analysis_result: "legacy-analysis" }),
      );

    const file = new File(["legacy-pdf-content"], "resume.pdf", {
      type: "application/pdf",
    });
    const result = await uploadResume(file, "Backend engineer");

    expect(result).toStrictEqual({ analysis_result: "legacy-analysis" });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) {
      throw new Error("Missing first call");
    }
    const firstPayload: {
      pdf_base64?: string;
    } = parseRequestJsonBody(firstCall[1]);
    expect(firstPayload.pdf_base64).toBeUndefined();

    const secondCall = fetchMock.mock.calls[1];
    if (!secondCall) {
      throw new Error("Missing second call");
    }
    const secondPayload: {
      pdf_base64?: string;
    } = parseRequestJsonBody(secondCall[1]);
    expectTypeOf(secondPayload.pdf_base64).toEqualTypeOf<string | undefined>();
    expect(secondPayload.pdf_base64?.length).toBeGreaterThan(0);
  });

  it("retries legacy upload with minimal metadata when backend returns MetadataTooLarge", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(400, {
          error: "Missing required field: pdf_base64",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(500, {
          error:
            "An error occurred (MetadataTooLarge) when calling the PutObject operation",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, { analysis_result: "legacy-analysis" }),
      );

    const file = new File(["legacy-pdf-content"], "resume.pdf", {
      type: "application/pdf",
    });
    const result = await uploadResume(
      file,
      "A very long description that should not be sent as metadata in the final retry path.",
    );

    expect(result).toStrictEqual({ analysis_result: "legacy-analysis" });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const secondCall = fetchMock.mock.calls[1];
    if (!secondCall) {
      throw new Error("Missing second call");
    }
    const secondPayload: {
      job_description?: string;
      pdf_base64?: string;
    } = parseRequestJsonBody(secondCall[1]);
    expect(secondPayload.pdf_base64).toBeDefined();
    expect(secondPayload.job_description).toBeDefined();

    const thirdCall = fetchMock.mock.calls[2];
    if (!thirdCall) {
      throw new Error("Missing third call");
    }
    const thirdPayload: {
      filename?: string;
      job_description?: string;
      pdf_base64?: string;
    } = parseRequestJsonBody(thirdCall[1]);
    expect(thirdPayload.filename).toBe("resume.pdf");
    expect(thirdPayload.pdf_base64).toBeDefined();
    expect(thirdPayload.job_description).toBeUndefined();
  });

  it("returns upstream 503 analyze error as a displayable message", async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          job_id: "job-503",
          s3_url: "s3://bucket/uploads/job-503/resume.pdf",
          upload: {
            fields: {
              "Content-Type": "application/pdf",
              key: "uploads/job-503/resume.pdf",
              policy: "policy",
              signature: "signature",
              "x-amz-meta-filename": "resume.pdf",
              "x-amz-meta-job_id": "job-503",
            },
            url: "https://bucket.s3.amazonaws.com",
          },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(204, {}))
      .mockResolvedValueOnce(
        createJsonResponse(503, {
          error:
            "Analysis service is temporarily unavailable due to high demand.\nPlease try again in a few minutes.",
          type: "ServiceUnavailable",
        }),
      );

    const file = new File(["pdf-content"], "resume.pdf", {
      type: "application/pdf",
    });

    let thrownError: unknown;
    try {
      await uploadResume(file, "Senior software engineer");
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toContain(
      "Analysis service is temporarily unavailable due to high demand.",
    );
    expect((thrownError as Error).message).not.toContain(
      "Analysis trigger failed with status: 503",
    );
  });

  it("throws when upload endpoint returns an unexpected payload shape", async () => {
    fetchMock.mockResolvedValueOnce(createJsonResponse(200, { foo: "bar" }));

    const file = new File(["pdf-content"], "resume.pdf", {
      type: "application/pdf",
    });

    await expect(
      uploadResume(file, "Senior software engineer"),
    ).rejects.toThrow("Unexpected response from upload endpoint.");
  });
});

describe("resume polling API", () => {
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

  it("throws when status endpoint returns an unexpected payload shape", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(createJsonResponse(200, { foo: "bar" }));

    const pollPromise = pollForResults(
      "job-123",
      vi.fn<(message: string) => void>(),
    );
    await Promise.all([
      vi.advanceTimersByTimeAsync(1000),
      expect(pollPromise).rejects.toThrow(
        "Unexpected response from status endpoint.",
      ),
    ]);
  });

  it("uses stepped backoff delays between polling attempts", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(createJsonResponse(200, { status: "processing" }))
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          analysis_result: "completed-analysis",
          status: "completed",
        }),
      );

    const onProgress = vi.fn<(message: string) => void>();
    const pollPromise = pollForResults("job-123", onProgress);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenCalledWith("Analyzing Resume...");

    await vi.advanceTimersByTimeAsync(1499);
    expect(fetchMock).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1);
    await expect(pollPromise).resolves.toBe("completed-analysis");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("supports aborting polling before the first request", async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      pollForResults("job-123", vi.fn<(message: string) => void>(), {
        signal: abortController.signal,
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
