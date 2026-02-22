import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadResume } from "@/lib/resume-utils";

const createJsonResponse = (status: number, data: unknown): Response =>
  ({
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn(async () => data),
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    text: vi.fn(async () => JSON.stringify(data)),
  }) as unknown as Response;

describe("uploadResume", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses presigned upload flow and triggers analysis", async () => {
    const fetchMock = vi.mocked(global.fetch);
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
    const firstPayload = JSON.parse(String(firstRequest.body)) as {
      filename: string;
      job_description: string;
    };
    expect(firstPayload.filename).toBe("resume.pdf");
    expect(firstPayload.job_description).toBe("Senior software engineer");

    const thirdRequest = fetchMock.mock.calls[2]?.[1] as RequestInit;
    const thirdPayload = JSON.parse(String(thirdRequest.body)) as {
      job_description: string;
      job_id: string;
      s3_url: string;
    };
    expect(thirdPayload.job_id).toBe("job-123");
    expect(thirdPayload.s3_url).toContain("s3://bucket/");
    expect(thirdPayload.job_description).toBe("Senior software engineer");
  });

  it("falls back to legacy pdf_base64 payload when required by backend", async () => {
    const fetchMock = vi.mocked(global.fetch);
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

    const firstPayload = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    ) as {
      pdf_base64?: string;
    };
    expect(firstPayload.pdf_base64).toBeUndefined();

    const secondPayload = JSON.parse(
      String((fetchMock.mock.calls[1]?.[1] as RequestInit).body),
    ) as {
      pdf_base64?: string;
    };
    expect(typeof secondPayload.pdf_base64).toBe("string");
    expect(secondPayload.pdf_base64?.length).toBeGreaterThan(0);
  });

  it("retries legacy upload with minimal metadata when backend returns MetadataTooLarge", async () => {
    const fetchMock = vi.mocked(global.fetch);
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

    const secondPayload = JSON.parse(
      String((fetchMock.mock.calls[1]?.[1] as RequestInit).body),
    ) as {
      job_description?: string;
      pdf_base64?: string;
    };
    expect(secondPayload.pdf_base64).toBeDefined();
    expect(secondPayload.job_description).toBeDefined();

    const thirdPayload = JSON.parse(
      String((fetchMock.mock.calls[2]?.[1] as RequestInit).body),
    ) as {
      filename?: string;
      job_description?: string;
      pdf_base64?: string;
    };
    expect(thirdPayload.filename).toBe("resume.pdf");
    expect(thirdPayload.pdf_base64).toBeDefined();
    expect(thirdPayload.job_description).toBeUndefined();
  });
});
