import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientError, getJson, postJson } from "@/lib/api-client";

const originalFetch = globalThis.fetch;

const createResponse = ({
  contentType = "application/json",
  data,
  jsonReject = false,
  ok = true,
  status = 200,
  text,
  textReject = false,
}: {
  contentType?: string;
  data?: unknown;
  jsonReject?: boolean;
  ok?: boolean;
  status?: number;
  text?: string;
  textReject?: boolean;
}): Response =>
  ({
    headers: new Headers(
      contentType ? { "content-type": contentType } : undefined,
    ),
    json: vi.fn(async () => {
      if (jsonReject) {
        throw new Error("Invalid JSON");
      }

      return data;
    }),
    ok,
    status,
    text: vi.fn(async () => {
      if (textReject) {
        throw new Error("Unable to read text");
      }

      return text ?? (typeof data === "string" ? data : JSON.stringify(data));
    }),
  }) as unknown as Response;

describe("api-client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("posts JSON payloads with the expected request config", async () => {
    const response = createResponse({ data: { ok: true } });
    const signal = new AbortController().signal;

    fetchMock.mockResolvedValue(response);

    const result = await postJson(
      "/api/upload",
      { filename: "resume.pdf" },
      { signal },
    );

    expect(result).toBe(response);
    expect(fetchMock).toHaveBeenCalledWith("/api/upload", {
      body: JSON.stringify({ filename: "resume.pdf" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal,
    });
  });

  it("issues GET requests with an optional abort signal", async () => {
    const response = createResponse({ data: { status: "ok" } });
    const signal = new AbortController().signal;

    fetchMock.mockResolvedValue(response);

    const result = await getJson("/api/status/job-123", { signal });

    expect(result).toBe(response);
    expect(fetchMock).toHaveBeenCalledWith("/api/status/job-123", {
      method: "GET",
      signal,
    });
  });

  it("surfaces structured JSON error payloads and logs them in development", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    vi.stubEnv("NODE_ENV", "development");
    fetchMock.mockResolvedValue(
      createResponse({
        data: {
          details: "Try again later.",
          error: "Upload failed.",
        },
        ok: false,
        status: 503,
      }),
    );

    const error = await postJson("/api/upload", {
      filename: "resume.pdf",
    }).catch((caughtError) => caughtError);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      data: {
        details: "Try again later.",
        error: "Upload failed.",
      },
      method: "POST",
      status: 503,
      url: "/api/upload",
    });
    expect((error as ApiClientError).message).toBe(
      "Upload failed. Try again later.",
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith("API client request failed", {
      data: {
        details: "Try again later.",
        error: "Upload failed.",
      },
      method: "POST",
      status: 503,
      url: "/api/upload",
    });
  });

  it("uses plain-text error responses as the error message", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        contentType: "text/plain",
        ok: false,
        status: 500,
        text: "Upstream service failed.",
      }),
    );

    await expect(getJson("/api/status/job-123")).rejects.toMatchObject({
      message: "Upstream service failed.",
      status: 500,
    });
  });

  it("falls back to a generic error message for unsupported payloads", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        data: 123,
        ok: false,
        status: 418,
      }),
    );

    await expect(getJson("/api/status/job-123")).rejects.toMatchObject({
      message: "GET /api/status/job-123 failed with status 418",
      status: 418,
    });
  });

  it("falls back cleanly when reading a non-JSON error body fails", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        contentType: "text/plain",
        ok: false,
        status: 502,
        textReject: true,
      }),
    );

    await expect(getJson("/api/status/job-123")).rejects.toMatchObject({
      data: null,
      message: "GET /api/status/job-123 failed with status 502",
      status: 502,
    });
  });

  it("falls back cleanly when parsing a JSON error body fails", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        data: { ignored: true },
        jsonReject: true,
        ok: false,
        status: 400,
      }),
    );

    await expect(
      postJson("/api/upload", { filename: "resume.pdf" }),
    ).rejects.toMatchObject({
      data: null,
      message: "POST /api/upload failed with status 400",
      status: 400,
    });
  });
});
