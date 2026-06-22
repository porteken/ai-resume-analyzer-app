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

const mockApiEndpoint = "https://api.example.com/upload";
const createRequest = createPostRequestFactory("/api/analyze");
const createRawRequest = createRawPostRequestFactory("/api/analyze");

describe("analyze API Route", () => {
  installApiRouteTestHooks(mockApiEndpoint);

  it("should proxy analyze requests to the canonical analyze endpoint", async () => {
    const mockResponseData = { status: "queued" };
    const mockedFetch = mockResolvedFetch(
      createJsonFetchResponse(mockResponseData),
    );

    const requestBody = {
      job_description: "Software Engineer",
      job_id: "job-123",
      s3_url: "s3://bucket/resume.pdf",
    };

    const data = await expectJsonResponse(
      () => POST(createRequest(requestBody)),
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
      POST(createRequest({ job_description: "test", job_id: "job-123" })),
    );
  });

  it("should return 400 for invalid JSON body", async () => {
    expect.hasAssertions();

    await expectInvalidJsonBodyError(() => POST(createRawRequest("{")));
  });

  it("should handle non-JSON responses from external API", async () => {
    expect.hasAssertions();

    await expectNonJsonUpstreamError(
      () => POST(createRequest({ job_id: "job-123" })),
      createTextFetchResponse("gateway error", 502),
    );
  });

  it("should return 504 for timeout errors", async () => {
    expect.hasAssertions();

    await expectTimeoutError(() => POST(createRequest({ job_id: "job-123" })));
  });

  it("should handle non-timeout fetch errors", async () => {
    expect.hasAssertions();

    await expectFetchError(() => POST(createRequest({ job_id: "job-123" })), {
      details: "Network error",
      error: "Failed to analyze resume",
    });
  });

  it("should forward API response status codes", async () => {
    expect.hasAssertions();

    await expectForwardedJsonError(
      () => POST(createRequest({ job_id: "job-123" })),
      { body: { error: "Bad request" }, error: "Bad request", status: 400 },
    );
  });
});
