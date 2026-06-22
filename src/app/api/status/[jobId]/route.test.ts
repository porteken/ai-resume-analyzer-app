import {
  createJsonFetchResponse,
  createTextFetchResponse,
  expectFetchError,
  expectForwardedJsonError,
  expectMissingEnvError,
  expectNonJsonUpstreamError,
  expectTimeoutError,
  installApiRouteTestHooks,
  mockResolvedFetch,
  mockApiKey,
} from "@/testing/route";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const mockApiEndpoint = "https://api.example.com/upload";

const createRequest = (jobId: string) =>
  new NextRequest(`http://localhost:3000/api/status/${jobId}`);

const createContext = (jobId: string) => ({
  params: Promise.resolve({ jobId }),
});

describe("status API Route", () => {
  installApiRouteTestHooks(mockApiEndpoint);

  it("should construct the status URL from upload endpoint", async () => {
    const mockedFetch = mockResolvedFetch(
      createJsonFetchResponse({ status: "processing" }),
    );

    await GET(createRequest("test-job-123"), createContext("test-job-123"));

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/status/test-job-123",
      expect.objectContaining({
        headers: {
          "x-api-key": mockApiKey,
        },
        method: "GET",
      }),
    );
  });

  it("should construct the status URL from analyze endpoint", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "https://api.example.com/analyze");

    const mockedFetch = mockResolvedFetch(
      createJsonFetchResponse({ status: "processing" }),
    );

    await GET(createRequest("job-xyz"), createContext("job-xyz"));

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/status/job-xyz",
      expect.any(Object),
    );
  });

  it("should URL-encode special characters in job ID", async () => {
    const mockedFetch = mockResolvedFetch(
      createJsonFetchResponse({ status: "processing" }),
    );

    const jobId = "job/123?x=1";
    await GET(createRequest(jobId), createContext(jobId));

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/status/job%2F123%3Fx%3D1",
      expect.any(Object),
    );
  });

  it("should return 500 if required env vars are missing", async () => {
    expect.hasAssertions();

    await expectMissingEnvError(() =>
      GET(createRequest("123"), createContext("123")),
    );
  });

  it("should handle non-JSON responses from external API", async () => {
    expect.hasAssertions();

    await expectNonJsonUpstreamError(
      () => GET(createRequest("invalid-id"), createContext("invalid-id")),
      createTextFetchResponse("<html>Not Found</html>", 404, "text/html"),
    );
  });

  it("should return 504 for timeout errors", async () => {
    expect.hasAssertions();

    await expectTimeoutError(() =>
      GET(createRequest("123"), createContext("123")),
    );
  });

  it("should handle non-timeout fetch errors", async () => {
    expect.hasAssertions();

    await expectFetchError(
      () => GET(createRequest("123"), createContext("123")),
      { details: "Connection timeout", error: "Failed to check status" },
    );
  });

  it("should forward API response status codes", async () => {
    expect.hasAssertions();

    await expectForwardedJsonError(
      () => GET(createRequest("nonexistent"), createContext("nonexistent")),
      { body: { error: "Job not found" }, error: "Job not found", status: 404 },
    );
  });
});
