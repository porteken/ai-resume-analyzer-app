import {
  createJsonFetchResponse,
  createPostRequestFactory,
  expectJsonResponse,
  installApiRouteTestHooks,
  mockApiKey,
  mockResolvedFetch,
} from "@/testing/route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleAnalyze } from "./analyze";
import { handleUpload } from "./upload";

const mockApiEndpoint = "https://api.example.com/analyze";
const createUploadRequest = createPostRequestFactory("/api/upload");
const createAnalyzeRequest = createPostRequestFactory("/api/analyze");

const withTurnstileEnv = (secret?: string) => ({
  API_ENDPOINT: mockApiEndpoint,
  API_KEY: mockApiKey,
  TURNSTILE_SECRET_KEY: secret,
});

const mockFetchByUrl = (verifySuccess: boolean, upstreamBody: object) => {
  const mock = vi.fn<typeof fetch>(async (input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.includes("challenges.cloudflare.com")) {
      return Response.json({ success: verifySuccess });
    }
    return Response.json(upstreamBody);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
};

describe("handlers with Turnstile enabled", () => {
  installApiRouteTestHooks(mockApiEndpoint);

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("upload strips turnstileToken before proxying on success", async () => {
    const upstream = { job_id: "123", status: "processing" };
    const mockedFetch = mockFetchByUrl(true, upstream);

    const data = await expectJsonResponse(
      () =>
        handleUpload(
          createUploadRequest({
            filename: "resume.pdf",
            job_description: "Engineer",
            turnstileToken: "good-token",
          }),
          withTurnstileEnv("test-secret"),
        ),
      200,
    );

    expect(data).toStrictEqual(upstream);
    // Second call is the upstream proxy; body must not contain the token.
    const upstreamCall = mockedFetch.mock.calls.find((call) => {
      const url =
        typeof call[0] === "string" ? call[0] : (call[0] as Request).url;
      return !url.includes("challenges.cloudflare");
    });
    expect(upstreamCall).toBeDefined();
    const upstreamInit = upstreamCall?.[1] as RequestInit;
    expect(upstreamInit.body as string).not.toContain("turnstileToken");
  });

  it("upload returns 403 when turnstileToken is missing", async () => {
    const mockedFetch = mockFetchByUrl(true, { job_id: "x" });

    const data = await expectJsonResponse(
      () =>
        handleUpload(
          createUploadRequest({ filename: "resume.pdf" }),
          withTurnstileEnv("test-secret"),
        ),
      403,
    );

    expect(data.error).toBe("Bot verification required");
    // Only verification path would have run, but missing token short-circuits fetch.
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("upload returns 403 when verification fails", async () => {
    mockFetchByUrl(false, { job_id: "x" });

    const data = await expectJsonResponse(
      () =>
        handleUpload(
          createUploadRequest({
            filename: "resume.pdf",
            turnstileToken: "bad-token",
          }),
          withTurnstileEnv("test-secret"),
        ),
      403,
    );

    expect(data.error).toBe("Bot verification failed");
  });

  it("upload fails open without secret and still proxies", async () => {
    const upstream = { job_id: "open", status: "processing" };
    const mockedFetch = mockResolvedFetch(createJsonFetchResponse(upstream));

    const data = await expectJsonResponse(
      () =>
        handleUpload(
          createUploadRequest({
            filename: "resume.pdf",
            turnstileToken: "tok-to-strip",
          }),
          withTurnstileEnv(),
        ),
      200,
    );

    expect(data).toStrictEqual(upstream);
    expect(mockedFetch).toHaveBeenCalledOnce();
    const [, init] = mockedFetch.mock.calls[0] as [string, RequestInit];
    expect(init.body as string).not.toContain("turnstileToken");
  });

  it("upload accepts non-string job_description (skips validation)", async () => {
    const upstream = { job_id: "num-desc" };
    mockFetchByUrl(true, upstream);

    const data = await expectJsonResponse(
      () =>
        handleUpload(
          createUploadRequest({
            filename: "resume.pdf",
            job_description: 12345,
            turnstileToken: "tok",
          }),
          withTurnstileEnv("test-secret"),
        ),
      200,
    );

    expect(data).toStrictEqual(upstream);
  });

  it("analyze strips turnstileToken and proxies on success", async () => {
    const upstream = { analysis_result: "ok" };
    const mockedFetch = mockFetchByUrl(true, upstream);

    const data = await expectJsonResponse(
      () =>
        handleAnalyze(
          createAnalyzeRequest({ job_id: "123", turnstileToken: "good" }),
          withTurnstileEnv("test-secret"),
        ),
      200,
    );

    expect(data).toStrictEqual(upstream);
    const upstreamCall = mockedFetch.mock.calls.find((call) => {
      const url =
        typeof call[0] === "string" ? call[0] : (call[0] as Request).url;
      return !url.includes("challenges.cloudflare");
    });
    const upstreamInit = upstreamCall?.[1] as RequestInit;
    expect(upstreamInit.body as string).not.toContain("turnstileToken");
  });

  it("analyze returns 403 when verification fails", async () => {
    mockFetchByUrl(false, {});

    const data = await expectJsonResponse(
      () =>
        handleAnalyze(
          createAnalyzeRequest({ job_id: "123", turnstileToken: "bad" }),
          withTurnstileEnv("test-secret"),
        ),
      403,
    );

    expect(data.error).toBe("Bot verification failed");
  });

  it("analyze returns 403 when token missing", async () => {
    const mockedFetch = mockFetchByUrl(true, {});

    const data = await expectJsonResponse(
      () =>
        handleAnalyze(
          createAnalyzeRequest({ job_id: "123" }),
          withTurnstileEnv("test-secret"),
        ),
      403,
    );

    expect(data.error).toBe("Bot verification required");
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
