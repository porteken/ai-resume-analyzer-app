import { MAX_JOB_DESCRIPTION_CHARS } from "@/features/resume-analysis/utils/job-description";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApiEndpoint = "https://api.example.com/analyze";
const mockApiKey = "test-api-key";
const createFetchMock = () => vi.fn<typeof fetch>();
const createMockResponse = (response: object): Response =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  response as unknown as Response;

const loadPostHandler = async () => {
  const routeModule = await import("./route");
  return routeModule.POST;
};

const createRequest = (body: object) =>
  new NextRequest("http://localhost:3000/api/upload", {
    body: JSON.stringify(body),
    method: "POST",
  });

const createRawRequest = (body: string) =>
  new NextRequest("http://localhost:3000/api/upload", {
    body,
    method: "POST",
  });

describe("upload API Route", () => {
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

  it("should proxy upload requests to the canonical upload endpoint", async () => {
    const mockResponseData = { job_id: "123", status: "processing" };
    const mockedFetch = createFetchMock().mockResolvedValue(
      createMockResponse({
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => Promise.resolve(mockResponseData),
        status: 200,
      }),
    );
    globalThis.fetch = mockedFetch as typeof fetch;

    const postHandler = await loadPostHandler();
    const requestBody = {
      filename: "resume.pdf",
      job_description: "Software Engineer",
      pdf_base64: "base64encodedpdf",
    };

    const response = await postHandler(createRequest(requestBody));
    const data = await response.json();

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
    expect(response.status).toBe(200);
    expect(data).toStrictEqual(mockResponseData);
  });

  it("should return 500 if required env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "");
    vi.stubEnv("API_KEY", "");

    const mockedFetch = createFetchMock();
    globalThis.fetch = mockedFetch as typeof fetch;
    const postHandler = await loadPostHandler();

    const response = await postHandler(
      createRequest({ job_description: "test", pdf_base64: "test" }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Server configuration error");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("should handle non-JSON responses from external API", async () => {
    const mockedFetch = createFetchMock().mockResolvedValue(
      createMockResponse({
        headers: new Headers({ "content-type": "text/html" }),
        status: 502,
        text: async () => Promise.resolve("<html>Error page</html>"),
      }),
    );
    globalThis.fetch = mockedFetch as typeof fetch;

    const postHandler = await loadPostHandler();
    const response = await postHandler(
      createRequest({ job_description: "test", pdf_base64: "test" }),
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain("non-JSON response");
  });

  it("should return 504 for timeout errors", async () => {
    const timeoutError = Object.assign(new Error("Request timeout"), {
      name: "TimeoutError",
    });
    const mockedFetch = createFetchMock().mockRejectedValue(timeoutError);
    globalThis.fetch = mockedFetch as typeof fetch;

    const postHandler = await loadPostHandler();
    const response = await postHandler(
      createRequest({ job_description: "test", pdf_base64: "test" }),
    );
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data.error).toBe("Upstream API request timed out");
  });

  it("should handle non-timeout fetch errors", async () => {
    const mockedFetch = createFetchMock().mockRejectedValue(
      new Error("Network error"),
    );
    globalThis.fetch = mockedFetch as typeof fetch;

    const postHandler = await loadPostHandler();
    const response = await postHandler(
      createRequest({ job_description: "test", pdf_base64: "test" }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to upload resume");
    expect(data.details).toBe("Network error");
  });

  it("should return 400 for invalid JSON body", async () => {
    const mockedFetch = createFetchMock();
    globalThis.fetch = mockedFetch as typeof fetch;

    const postHandler = await loadPostHandler();
    const response = await postHandler(createRawRequest("{"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("should return 400 for non-object JSON body", async () => {
    const mockedFetch = createFetchMock();
    globalThis.fetch = mockedFetch as typeof fetch;

    const postHandler = await loadPostHandler();
    const response = await postHandler(
      createRawRequest(JSON.stringify("invalid")),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("should return 400 for overly long job descriptions", async () => {
    const mockedFetch = createFetchMock();
    globalThis.fetch = mockedFetch as typeof fetch;

    const postHandler = await loadPostHandler();
    const longDescription = "a".repeat(MAX_JOB_DESCRIPTION_CHARS + 1);
    const response = await postHandler(
      createRequest({ job_description: longDescription, pdf_base64: "test" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid job description");
    expect(data.details).toContain("too long");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("should forward API response status codes", async () => {
    const mockedFetch = createFetchMock().mockResolvedValue(
      createMockResponse({
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => Promise.resolve({ error: "Invalid input" }),
        status: 400,
      }),
    );
    globalThis.fetch = mockedFetch as typeof fetch;

    const postHandler = await loadPostHandler();
    const response = await postHandler(
      createRequest({ job_description: "test", pdf_base64: "test" }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });
});
