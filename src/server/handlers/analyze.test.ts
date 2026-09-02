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
  mockApiKey,
  mockResolvedFetch,
} from "@/testing/route";
import { describe, expect, it } from "vitest";

import { handleAnalyze } from "./analyze";

const mockApiEndpoint = "https://api.example.com/analyze";
const createRequest = createPostRequestFactory("/api/analyze");
const createRawRequest = createRawPostRequestFactory("/api/analyze");

describe("analyze API Handler", () => {
  installApiRouteTestHooks(mockApiEndpoint);

  it("should proxy analyze requests to the canonical analyze endpoint", async () => {
    const mockResponseData = {
      analysis_result: "## Analysis\nStrong candidate",
    };
    const mockedFetch = mockResolvedFetch(
      createJsonFetchResponse(mockResponseData),
    );

    const requestBody = {
      job_description: "Software Engineer",
      job_id: "123",
      s3_url: "s3://bucket/resume.pdf",
    };

    const data = await expectJsonResponse(
      () => handleAnalyze(createRequest(requestBody)),
      200,
    );

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/analyze",
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
    expect.hasAssertions();

    await expectMissingEnvError(() =>
      handleAnalyze(createRequest({ job_id: "123" })),
    );
  });

  it("should handle non-JSON responses from external API", async () => {
    expect.hasAssertions();

    await expectNonJsonUpstreamError(
      () => handleAnalyze(createRequest({ job_id: "123" })),
      createTextFetchResponse("<html>Error page</html>", 502, "text/html"),
    );
  });

  it("should return 504 for timeout errors", async () => {
    expect.hasAssertions();

    await expectTimeoutError(() =>
      handleAnalyze(createRequest({ job_id: "123" })),
    );
  });

  it("should handle non-timeout fetch errors", async () => {
    expect.hasAssertions();

    await expectFetchError(
      () => handleAnalyze(createRequest({ job_id: "123" })),
      { details: "Network error", error: "Failed to analyze resume" },
    );
  });

  it("should return 400 for invalid JSON body", async () => {
    expect.hasAssertions();

    await expectInvalidJsonBodyError(() =>
      handleAnalyze(createRawRequest("invalid-json")),
    );
  });

  it("should forward API response status codes", async () => {
    expect.hasAssertions();

    await expectForwardedJsonError(
      () => handleAnalyze(createRequest({ job_id: "123" })),
      {
        body: { error: "Analysis failed" },
        error: "Analysis failed",
        status: 422,
      },
    );
  });
});
