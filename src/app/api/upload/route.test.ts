import { MAX_JOB_DESCRIPTION_CHARS } from "@/features/resume-analysis/utils/job-description";
import {
  createJsonFetchResponse,
  createPostRequestFactory,
  createRawPostRequestFactory,
  createTextFetchResponse,
  expectFetchError,
  expectForwardedJsonError,
  expectInvalidJsonBodyError,
  expectJsonResponse,
  expectMissingEnvError,
  expectNonJsonUpstreamError,
  expectTimeoutError,
  installApiRouteTestHooks,
  mockResolvedFetch,
  mockApiKey,
} from "@/testing/route";
import { describe, expect, it } from "vitest";

import { POST } from "./route";

const mockApiEndpoint = "https://api.example.com/analyze";
const createRequest = createPostRequestFactory("/api/upload");
const createRawRequest = createRawPostRequestFactory("/api/upload");

describe("upload API Route", () => {
  installApiRouteTestHooks(mockApiEndpoint);

  it("should proxy upload requests to the canonical upload endpoint", async () => {
    const mockResponseData = { job_id: "123", status: "processing" };
    const mockedFetch = mockResolvedFetch(
      createJsonFetchResponse(mockResponseData),
    );

    const requestBody = {
      filename: "resume.pdf",
      job_description: "Software Engineer",
      pdf_base64: "base64encodedpdf",
    };

    const data = await expectJsonResponse(
      () => POST(createRequest(requestBody)),
      200,
    );

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/upload",
      expect.objectContaining({
        body: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": mockApiKey,
        },
        method: "POST",
      }),
    );
    expect(data).toStrictEqual(mockResponseData);
  });

  it("should return 500 if required env vars are missing", async () => {
    await expectMissingEnvError(() =>
      POST(createRequest({ job_description: "test", pdf_base64: "test" })),
    );
  });

  it("should handle non-JSON responses from external API", async () => {
    await expectNonJsonUpstreamError(
      () =>
        POST(createRequest({ job_description: "test", pdf_base64: "test" })),
      createTextFetchResponse("<html>Error page</html>", 502, "text/html"),
    );
  });

  it("should return 504 for timeout errors", async () => {
    await expectTimeoutError(() =>
      POST(createRequest({ job_description: "test", pdf_base64: "test" })),
    );
  });

  it("should handle non-timeout fetch errors", async () => {
    await expectFetchError(
      () =>
        POST(createRequest({ job_description: "test", pdf_base64: "test" })),
      { details: "Network error", error: "Failed to upload resume" },
    );
  });

  it("should return 400 for invalid JSON body", async () => {
    await expectInvalidJsonBodyError(() =>
      POST(createRawRequest("invalid-json")),
    );
  });

  it("should return 400 for overly long job descriptions", async () => {
    const mockedFetch = mockResolvedFetch({});

    const longDescription = "a".repeat(MAX_JOB_DESCRIPTION_CHARS + 1);
    const data = await expectJsonResponse(
      () =>
        POST(
          createRequest({
            job_description: longDescription,
            pdf_base64: "test",
          }),
        ),
      400,
    );

    expect(data.error).toBe("Invalid job description");
    expect(data.details).toContain("too long");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("should forward API response status codes", async () => {
    await expectForwardedJsonError(
      () =>
        POST(createRequest({ job_description: "test", pdf_base64: "test" })),
      { body: { error: "Invalid input" }, error: "Invalid input", status: 400 },
    );
  });
});
