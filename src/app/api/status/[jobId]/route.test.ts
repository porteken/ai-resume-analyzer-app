import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApiEndpoint = "https://api.example.com/upload";
const mockApiKey = "test-api-key";
const createFetchMock = () => vi.fn<typeof fetch>();
const createMockResponse = (response: object): Response =>
  response as unknown as Response;

const loadGetHandler = async () => {
  const routeModule = await import("./route");
  return routeModule.GET;
};

const createRequest = (jobId: string) =>
  new NextRequest(`http://localhost:3000/api/status/${jobId}`);

const createContext = (jobId: string) => ({
  params: Promise.resolve({ jobId }),
});

describe("status API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "");
    vi.stubEnv("API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", mockApiEndpoint);
    vi.stubEnv("API_KEY", mockApiKey);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("should construct the status URL from upload endpoint", async () => {
    const mockedFetch = createFetchMock().mockResolvedValue(
      createMockResponse({
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ status: "processing" }),
        status: 200,
      }),
    );
    globalThis.fetch = mockedFetch;

    const getHandler = await loadGetHandler();
    await getHandler(
      createRequest("test-job-123"),
      createContext("test-job-123"),
    );

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

    const mockedFetch = createFetchMock().mockResolvedValue(
      createMockResponse({
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ status: "processing" }),
        status: 200,
      }),
    );
    globalThis.fetch = mockedFetch;

    const getHandler = await loadGetHandler();
    await getHandler(createRequest("job-xyz"), createContext("job-xyz"));

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/status/job-xyz",
      expect.any(Object),
    );
  });

  it("should URL-encode special characters in job ID", async () => {
    const mockedFetch = createFetchMock().mockResolvedValue(
      createMockResponse({
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ status: "processing" }),
        status: 200,
      }),
    );
    globalThis.fetch = mockedFetch;

    const jobId = "job/123?x=1";
    const getHandler = await loadGetHandler();
    await getHandler(createRequest(jobId), createContext(jobId));

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/status/job%2F123%3Fx%3D1",
      expect.any(Object),
    );
  });

  it("should return 500 if required env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "");
    vi.stubEnv("API_KEY", "");

    const mockedFetch = createFetchMock();
    globalThis.fetch = mockedFetch;

    const getHandler = await loadGetHandler();
    const response = await getHandler(
      createRequest("123"),
      createContext("123"),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Server configuration error");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("should handle non-JSON responses from external API", async () => {
    globalThis.fetch = createFetchMock().mockResolvedValue(
      createMockResponse({
        headers: new Headers({ "content-type": "text/html" }),
        status: 404,
        text: async () => "<html>Not Found</html>",
      }),
    );

    const getHandler = await loadGetHandler();
    const response = await getHandler(
      createRequest("invalid-id"),
      createContext("invalid-id"),
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain("non-JSON response");
  });

  it("should return 504 for timeout errors", async () => {
    const timeoutError = Object.assign(new Error("Request timeout"), {
      name: "TimeoutError",
    });
    globalThis.fetch = createFetchMock().mockRejectedValue(timeoutError);

    const getHandler = await loadGetHandler();
    const response = await getHandler(
      createRequest("123"),
      createContext("123"),
    );
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data.error).toBe("Upstream API request timed out");
  });

  it("should handle non-timeout fetch errors", async () => {
    globalThis.fetch = createFetchMock().mockRejectedValue(
      new Error("Connection timeout"),
    );

    const getHandler = await loadGetHandler();
    const response = await getHandler(
      createRequest("123"),
      createContext("123"),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to check status");
    expect(data.details).toBe("Connection timeout");
  });

  it("should forward API response status codes", async () => {
    globalThis.fetch = createFetchMock().mockResolvedValue(
      createMockResponse({
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ error: "Job not found" }),
        status: 404,
      }),
    );

    const getHandler = await loadGetHandler();
    const response = await getHandler(
      createRequest("nonexistent"),
      createContext("nonexistent"),
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Job not found");
  });
});
