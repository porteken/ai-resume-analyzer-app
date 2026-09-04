import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstileRequest } from "./turnstile";

import type { Mock } from "vitest";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const createRequest = (headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/upload", { headers });

const mockVerifyResponse = (data: unknown) =>
  Response.json(data, { status: 200 });

describe("verifyTurnstileRequest", () => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    vi.unstubAllEnvs();
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("fails open and strips token when no secret is configured", async () => {
    const body: Record<string, unknown> = {
      filename: "resume.pdf",
      turnstileToken: "client-token",
    };
    const result = await verifyTurnstileRequest(body, createRequest());

    expect(result).toBeNull();
    expect(body).not.toHaveProperty("turnstileToken");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails open when secret is blank whitespace", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "   ");
    const body: Record<string, unknown> = { turnstileToken: "abc" };

    const result = await verifyTurnstileRequest(body, createRequest());

    expect(result).toBeNull();
    expect(body).not.toHaveProperty("turnstileToken");
  });

  it("trims secret from environment object", async () => {
    fetchMock.mockResolvedValueOnce(mockVerifyResponse({ success: true }));
    const body: Record<string, unknown> = { turnstileToken: "tok" };

    const result = await verifyTurnstileRequest(body, createRequest(), {
      API_ENDPOINT: "https://api.example.com",
      API_KEY: "k",
      TURNSTILE_SECRET_KEY: "  secret-123  ",
    });

    expect(result).toBeNull();
    expect(body).not.toHaveProperty("turnstileToken");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body as string).toContain("secret=secret-123");
  });

  it("returns 403 when token is missing", async () => {
    const body: Record<string, unknown> = { filename: "a.pdf" };
    const result = await verifyTurnstileRequest(body, createRequest(), {
      TURNSTILE_SECRET_KEY: "secret",
    });

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(403);
    const data = (await result?.json()) as { error?: string };
    expect(data.error).toBe("Bot verification required");
    expect(body).not.toHaveProperty("turnstileToken");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 403 when token is blank", async () => {
    const body: Record<string, unknown> = { turnstileToken: "   " };
    const result = await verifyTurnstileRequest(body, createRequest(), {
      TURNSTILE_SECRET_KEY: "secret",
    });

    expect(result?.status).toBe(403);
    expect(body).not.toHaveProperty("turnstileToken");
  });

  it("returns 403 when token is not a string", async () => {
    const body: Record<string, unknown> = { turnstileToken: 12345 };
    const result = await verifyTurnstileRequest(body, createRequest(), {
      TURNSTILE_SECRET_KEY: "secret",
    });

    expect(result?.status).toBe(403);
  });

  it("returns null on successful verification and strips token", async () => {
    fetchMock.mockResolvedValueOnce(mockVerifyResponse({ success: true }));
    const body: Record<string, unknown> = {
      filename: "r.pdf",
      turnstileToken: "good-token",
    };

    const result = await verifyTurnstileRequest(
      body,
      createRequest({ "cf-connecting-ip": "1.2.3.4" }),
      { TURNSTILE_SECRET_KEY: "secret" },
    );

    expect(result).toBeNull();
    expect(body).not.toHaveProperty("turnstileToken");
    expect(fetchMock).toHaveBeenCalledWith(
      VERIFY_URL,
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const params = new URLSearchParams(init.body as string);
    expect(params.get("secret")).toBe("secret");
    expect(params.get("response")).toBe("good-token");
    expect(params.get("remoteip")).toBe("1.2.3.4");
  });

  it("prefers x-forwarded-for first entry when cf-connecting-ip missing", async () => {
    fetchMock.mockResolvedValueOnce(mockVerifyResponse({ success: true }));
    const body: Record<string, unknown> = { turnstileToken: "tok" };

    await verifyTurnstileRequest(
      body,
      createRequest({ "x-forwarded-for": " 9.9.9.9, 8.8.8.8 " }),
      { TURNSTILE_SECRET_KEY: "secret" },
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const params = new URLSearchParams(init.body as string);
    expect(params.get("remoteip")).toBe("9.9.9.9");
  });

  it("omits remoteip when no forwarding headers present", async () => {
    fetchMock.mockResolvedValueOnce(mockVerifyResponse({ success: true }));
    const body: Record<string, unknown> = { turnstileToken: "tok" };

    await verifyTurnstileRequest(body, createRequest(), {
      TURNSTILE_SECRET_KEY: "secret",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const params = new URLSearchParams(init.body as string);
    expect(params.has("remoteip")).toBe(false);
  });

  it("returns 403 when verification reports success=false", async () => {
    fetchMock.mockResolvedValueOnce(mockVerifyResponse({ success: false }));
    const body: Record<string, unknown> = { turnstileToken: "bad" };

    const result = await verifyTurnstileRequest(body, createRequest(), {
      TURNSTILE_SECRET_KEY: "secret",
    });

    expect(result?.status).toBe(403);
    const data = (await result?.json()) as { error?: string };
    expect(data.error).toBe("Bot verification failed");
  });

  it("returns 403 when verify payload is null (json null)", async () => {
    fetchMock.mockResolvedValueOnce(mockVerifyResponse(null));
    const body: Record<string, unknown> = { turnstileToken: "tok" };

    const result = await verifyTurnstileRequest(body, createRequest(), {
      TURNSTILE_SECRET_KEY: "secret",
    });

    expect(result?.status).toBe(403);
  });

  it("returns 403 when verify response json() throws", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Response);
    const body: Record<string, unknown> = { turnstileToken: "tok" };

    const result = await verifyTurnstileRequest(body, createRequest(), {
      TURNSTILE_SECRET_KEY: "secret",
    });

    expect(result?.status).toBe(403);
  });

  it("returns 403 when fetch throws (network failure)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const body: Record<string, unknown> = { turnstileToken: "tok" };

    const result = await verifyTurnstileRequest(body, createRequest(), {
      TURNSTILE_SECRET_KEY: "secret",
    });

    expect(result?.status).toBe(403);
  });

  it("reads secret from process.env when environment arg omitted", async () => {
    process.env.TURNSTILE_SECRET_KEY = "proc-secret";
    fetchMock.mockResolvedValueOnce(mockVerifyResponse({ success: true }));
    const body: Record<string, unknown> = { turnstileToken: "tok" };

    const result = await verifyTurnstileRequest(body, createRequest());

    expect(result).toBeNull();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body as string).toContain("secret=proc-secret");
  });
});
