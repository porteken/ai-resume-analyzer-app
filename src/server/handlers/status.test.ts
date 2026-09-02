import {
  createJsonFetchResponse,
  createTextFetchResponse,
  expectFetchError,
  expectForwardedJsonError,
  expectJsonResponse,
  expectMissingEnvError,
  expectNonJsonUpstreamError,
  expectTimeoutError,
  installApiRouteTestHooks,
  mockApiKey,
  mockResolvedFetch,
} from "@/testing/route";
import { describe, expect, it } from "vitest";

import { handleStatus } from "./status";

const mockApiEndpoint = "https://api.example.com/analyze";
const createGetRequest = (url: string) => new Request(url, { method: "GET" });

describe("status API Handler", () => {
  installApiRouteTestHooks(mockApiEndpoint);

  it("should proxy status requests with encoded jobId", async () => {
    const mockResponseData = {
      analysis_result: "Done",
      status: "completed",
    };
    const mockedFetch = mockResolvedFetch(
      createJsonFetchResponse(mockResponseData),
    );

    const request = createGetRequest(
      "http://localhost:3000/api/status/job-123",
    );

    const data = await expectJsonResponse(
      () => handleStatus(request, "job-123"),
      200,
    );

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/status/job-123",
      expect.objectContaining({
        headers: {
          "x-api-key": mockApiKey,
        },
        method: "GET",
      }),
    );
    expect(data).toStrictEqual(mockResponseData);
  });

  it("should properly URL-encode special characters in jobId", async () => {
    const mockResponseData = { status: "processing" };
    const mockedFetch = mockResolvedFetch(
      createJsonFetchResponse(mockResponseData),
    );

    const request = createGetRequest(
      "http://localhost:3000/api/status/job/special",
    );

    await expectJsonResponse(() => handleStatus(request, "job/special"), 200);

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/status/job%2Fspecial",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("should return 500 if required env vars are missing", async () => {
    expect.hasAssertions();

    const request = createGetRequest("http://localhost:3000/api/status/123");
    await expectMissingEnvError(() => handleStatus(request, "123"));
  });

  it("should handle non-JSON responses from external API", async () => {
    expect.hasAssertions();

    const request = createGetRequest("http://localhost:3000/api/status/123");
    await expectNonJsonUpstreamError(
      () => handleStatus(request, "123"),
      createTextFetchResponse("<html>Error page</html>", 502, "text/html"),
    );
  });

  it("should return 504 for timeout errors", async () => {
    expect.hasAssertions();

    const request = createGetRequest("http://localhost:3000/api/status/123");
    await expectTimeoutError(() => handleStatus(request, "123"));
  });

  it("should handle non-timeout fetch errors", async () => {
    expect.hasAssertions();

    const request = createGetRequest("http://localhost:3000/api/status/123");
    await expectFetchError(() => handleStatus(request, "123"), {
      details: "Network error",
      error: "Failed to check status",
    });
  });

  it("should forward API response status codes", async () => {
    expect.hasAssertions();

    const request = createGetRequest("http://localhost:3000/api/status/123");
    await expectForwardedJsonError(() => handleStatus(request, "123"), {
      body: { error: "Job not found" },
      error: "Job not found",
      status: 404,
    });
  });
});
