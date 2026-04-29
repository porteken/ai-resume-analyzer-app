/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
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

const originalFetch = globalThis.fetch;
const createFetchMock = () => vi.fn<typeof fetch>();

const createJsonResponse = (status: number, data: unknown): Response =>
  ({
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn<() => Promise<unknown>>(() => Promise.resolve(data)),
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    text: vi.fn<() => Promise<string>>(() =>
      Promise.resolve(JSON.stringify(data)),
    ),
  }) as unknown as Response;

const createOpaqueResponse = (): Response =>
  ({
    headers: new Headers(),
    json: vi.fn<() => Promise<unknown>>(() => Promise.resolve(null)),
    ok: false,
    status: 0,
    statusText: "",
    text: vi.fn<() => Promise<string>>(() => Promise.resolve("")),
    type: "opaque",
  }) as unknown as Response;

const parseRequestJsonBody = <T>(request: RequestInit | undefined): T => {
  const body = request?.body;

  if (typeof body !== "string") {
    throw new TypeError("Expected request body to be a JSON string");
  }

  return JSON.parse(body) as T;
};

describe("resume upload API", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
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

    const firstRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const firstPayload = parseRequestJsonBody<{
      filename: string;
      job_description: string;
    }>(firstRequest);
    expect(firstPayload.filename).toBe("resume.pdf");
    expect(firstPayload.job_description).toBe("Senior software engineer");

    const thirdRequest = fetchMock.mock.calls[2]?.[1] as RequestInit;
    const thirdPayload = parseRequestJsonBody<{
      job_description: string;
      job_id: string;
      s3_url: string;
    }>(thirdRequest);
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

    const secondRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(secondRequest.mode).toBe("no-cors");
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

    const firstPayload = parseRequestJsonBody<{
      pdf_base64?: string;
    }>(fetchMock.mock.calls[0]?.[1] as RequestInit);
    expect(firstPayload.pdf_base64).toBeUndefined();

    const secondPayload = parseRequestJsonBody<{
      pdf_base64?: string;
    }>(fetchMock.mock.calls[1]?.[1] as RequestInit);
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

    const secondPayload = parseRequestJsonBody<{
      job_description?: string;
      pdf_base64?: string;
    }>(fetchMock.mock.calls[1]?.[1] as RequestInit);
    expect(secondPayload.pdf_base64).toBeDefined();
    expect(secondPayload.job_description).toBeDefined();

    const thirdPayload = parseRequestJsonBody<{
      filename?: string;
      job_description?: string;
      pdf_base64?: string;
    }>(fetchMock.mock.calls[2]?.[1] as RequestInit);
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
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = createFetchMock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = originalFetch;
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith("Analyzing Resume...");

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

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
