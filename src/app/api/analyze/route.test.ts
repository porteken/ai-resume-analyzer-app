import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApiEndpoint = "https://api.example.com/upload";
const mockApiKey = "test-api-key";

const loadPostHandler = async () => {
  const routeModule = await import("./route");
  return routeModule.POST;
};

const createRequest = (body: object) =>
  new NextRequest("http://localhost:3000/api/analyze", {
    body: JSON.stringify(body),
    method: "POST",
  });

const createRawRequest = (body: string) =>
  new NextRequest("http://localhost:3000/api/analyze", {
    body,
    method: "POST",
  });

describe("Analyze API Route", () => {
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

  it("should proxy analyze requests to the canonical analyze endpoint", async () => {
    const mockResponseData = { status: "queued" };
    const mockedFetch = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockResponseData,
      status: 200,
    });
    globalThis.fetch = mockedFetch as typeof fetch;

    const POST = await loadPostHandler();
    const requestBody = {
      job_description: "Software Engineer",
      job_id: "job-123",
      s3_url: "s3://bucket/resume.pdf",
    };

    const response = await POST(createRequest(requestBody));
    const data = await response.json();

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://api.example.com/analyze",
      expect.objectContaining({
        body: JSON.stringify(requestBody),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": mockApiKey,
        },
        method: "POST",
      })
    );
    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponseData);
  });

  it("should return 500 if required env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "");
    vi.stubEnv("API_KEY", "");

    const mockedFetch = vi.fn();
    globalThis.fetch = mockedFetch as typeof fetch;
    const POST = await loadPostHandler();

    const response = await POST(createRequest({ job_description: "test", job_id: "job-123" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Server configuration error");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid JSON body", async () => {
    const mockedFetch = vi.fn();
    globalThis.fetch = mockedFetch as typeof fetch;

    const POST = await loadPostHandler();
    const response = await POST(createRawRequest("{"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("should return 400 for non-object JSON body", async () => {
    const mockedFetch = vi.fn();
    globalThis.fetch = mockedFetch as typeof fetch;

    const POST = await loadPostHandler();
    const response = await POST(createRawRequest(JSON.stringify("invalid")));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("should handle non-JSON responses from external API", async () => {
    const mockedFetch = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "text/plain" }),
      status: 502,
      text: async () => "gateway error",
    });
    globalThis.fetch = mockedFetch as typeof fetch;

    const POST = await loadPostHandler();
    const response = await POST(createRequest({ job_id: "job-123" }));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain("non-JSON response");
  });

  it("should return 504 for timeout errors", async () => {
    const timeoutError = Object.assign(new Error("Request timeout"), {
      name: "TimeoutError",
    });
    const mockedFetch = vi.fn().mockRejectedValue(timeoutError);
    globalThis.fetch = mockedFetch as typeof fetch;

    const POST = await loadPostHandler();
    const response = await POST(createRequest({ job_id: "job-123" }));
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data.error).toBe("Upstream API request timed out");
  });

  it("should handle non-timeout fetch errors", async () => {
    const mockedFetch = vi
      .fn()
      .mockImplementation(() => Promise.reject(new Error("Network error")));
    globalThis.fetch = mockedFetch as typeof fetch;

    const POST = await loadPostHandler();
    const response = await POST(createRequest({ job_id: "job-123" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to analyze resume");
    expect(data.details).toBe("Network error");
  });

  it("should forward API response status codes", async () => {
    const mockedFetch = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ error: "Bad request" }),
      status: 400,
    });
    globalThis.fetch = mockedFetch as typeof fetch;

    const POST = await loadPostHandler();
    const response = await POST(createRequest({ job_id: "job-123" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Bad request");
  });
});
