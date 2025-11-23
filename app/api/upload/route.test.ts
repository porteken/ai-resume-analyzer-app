import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApiEndpoint = "https://api.example.com/analyze";
const mockApiKey = "test-api-key";

vi.mock("./route", () => {
  return {
    POST: vi.fn(),
  };
});

describe("Upload API Route", () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});

    POST = vi.fn(async (request: NextRequest) => {
      const body = await request.json();

      try {
        const response = await globalThis.fetch(mockApiEndpoint, {
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "x-api-key": mockApiKey,
          },
          method: "POST",
        });

        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          const text = await response.text();
          console.error("Non-JSON response:", {
            contentType,
            preview: text.slice(0, 200),
            status: response.status,
          });
          return Response.json(
            {
              details: text.slice(0, 200),
              error: `External API returned non-JSON response (${response.status}). Check API_ENDPOINT in .env.local`,
            },
            { status: 502 },
          );
        }

        const data = await response.json();

        return Response.json(data, { status: response.status });
      } catch (error) {
        console.error("Upload API error:", error);
        return Response.json(
          {
            details: error instanceof Error ? error.message : "Unknown error",
            error: "Failed to upload resume",
          },
          { status: 500 },
        );
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully proxy request to external API", async () => {
    const mockResponseData = { job_id: "123", status: "processing" };

    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockResponseData,
      status: 200,
    });

    const requestBody = {
      filename: "resume.pdf",
      job_description: "Software Engineer",
      pdf_base64: "base64encodedpdf",
    };

    const request = new NextRequest("http://localhost:3000/api/upload", {
      body: JSON.stringify(requestBody),
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      mockApiEndpoint,
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
    expect(data).toEqual(mockResponseData);
  });

  it("should handle non-JSON responses from external API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "text/html" }),
      status: 502,
      text: async () => "<html>Error page</html>",
    });

    const request = new NextRequest("http://localhost:3000/api/upload", {
      body: JSON.stringify({ job_description: "test", pdf_base64: "test" }),
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain("non-JSON response");
  });

  it("should handle fetch errors", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => Promise.reject(new Error("Network error")));

    const request = new NextRequest("http://localhost:3000/api/upload", {
      body: JSON.stringify({ job_description: "test", pdf_base64: "test" }),
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to upload resume");
    expect(data.details).toBe("Network error");
  });

  it("should forward API response status codes", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ error: "Invalid input" }),
      status: 400,
    });

    const request = new NextRequest("http://localhost:3000/api/upload", {
      body: JSON.stringify({ job_description: "test", pdf_base64: "test" }),
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid input");
  });

  it("should handle large PDF payloads", async () => {
    const mockResponseData = { job_id: "456" };

    globalThis.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockResponseData,
      status: 200,
    });

    const largePdfBase64 = "A".repeat(1024 * 1024);

    const request = new NextRequest("http://localhost:3000/api/upload", {
      body: JSON.stringify({
        filename: "large.pdf",
        job_description: "Test job",
        pdf_base64: largePdfBase64,
      }),
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponseData);
  });
});
