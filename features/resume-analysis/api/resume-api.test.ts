import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadResume } from "@/features/resume-analysis/api/resume-api";

const createJsonResponse = (status: number, data: unknown): Response =>
  ({
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn(async () => data),
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    text: vi.fn(async () => JSON.stringify(data)),
  }) as unknown as Response;

const parseRequestJsonBody = <T>(request: RequestInit | undefined): T => {
  const body = request?.body;

  if (typeof body !== "string") {
    throw new TypeError("Expected request body to be a JSON string");
  }

  return JSON.parse(body) as T;
};

describe("uploadResume", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses presigned upload flow and triggers analysis", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
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

    expect(result).toEqual({ job_id: "job-123" });
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

  it("falls back to legacy pdf_base64 payload when required by backend", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
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

    expect(result).toEqual({ analysis_result: "legacy-analysis" });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstPayload = parseRequestJsonBody<{
      pdf_base64?: string;
    }>(fetchMock.mock.calls[0]?.[1] as RequestInit);
    expect(firstPayload.pdf_base64).toBeUndefined();

    const secondPayload = parseRequestJsonBody<{
      pdf_base64?: string;
    }>(fetchMock.mock.calls[1]?.[1] as RequestInit);
    expect(typeof secondPayload.pdf_base64).toBe("string");
    expect(secondPayload.pdf_base64?.length).toBeGreaterThan(0);
  });

  it("retries legacy upload with minimal metadata when backend returns MetadataTooLarge", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
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

    expect(result).toEqual({ analysis_result: "legacy-analysis" });
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
    const fetchMock = vi.mocked(globalThis.fetch);
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
});
