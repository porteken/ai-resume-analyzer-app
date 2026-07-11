import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, vi } from "vitest";

export const mockApiKey = "test-api-key";

const createFetchMock = () => vi.fn<typeof fetch>();

const createMockResponse = (response: object): Response =>
  response as unknown as Response;

export const createJsonFetchResponse = (body: object, status = 200) => ({
  headers: new Headers({ "content-type": "application/json" }),
  json: async () => body,
  status,
});

export const createTextFetchResponse = (
  body: string,
  status: number,
  contentType = "text/plain",
) => ({
  headers: new Headers({ "content-type": contentType }),
  status,
  text: async () => body,
});

const createJsonRequest = (url: string, body: object) =>
  new NextRequest(url, {
    body: JSON.stringify(body),
    method: "POST",
  });

const createRawPostRequest = (url: string, body: string) =>
  new NextRequest(url, {
    body,
    method: "POST",
  });

export const createPostRequestFactory = (pathname: string) => (body: object) =>
  createJsonRequest(`http://localhost:3000${pathname}`, body);

export const createRawPostRequestFactory =
  (pathname: string) => (body: string) =>
    createRawPostRequest(`http://localhost:3000${pathname}`, body);

function createTimeoutError(): Error {
  return Object.assign(new Error("Request timeout"), {
    name: "TimeoutError",
  });
}

export function installApiRouteTestHooks(apiEndpoint: string) {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    stubApiRouteEnv(apiEndpoint);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
}

export function mockResolvedFetch(response: object) {
  const mockedFetch = createFetchMock().mockResolvedValue(
    createMockResponse(response),
  );
  globalThis.fetch = mockedFetch;
  return mockedFetch;
}

function mockRejectedFetch(error: unknown) {
  const mockedFetch = createFetchMock().mockRejectedValue(error);
  globalThis.fetch = mockedFetch;
  return mockedFetch;
}

export async function expectJsonResponse(
  invokeRoute: () => Promise<Response>,
  expectedStatus: number,
) {
  const response = await invokeRoute();
  const data = await response.json();

  expect(response.status).toBe(expectedStatus);
  return data;
}

export async function expectMissingEnvError(
  invokeRoute: () => Promise<Response>,
) {
  stubMissingApiRouteEnv();

  const mockedFetch = createFetchMock();
  globalThis.fetch = mockedFetch;

  const data = await expectJsonResponse(invokeRoute, 500);

  expect(data.error).toContain("Server configuration error");
  expect(mockedFetch).not.toHaveBeenCalled();
}

export async function expectInvalidJsonBodyError(
  invokeRoute: () => Promise<Response>,
) {
  const mockedFetch = createFetchMock();
  globalThis.fetch = mockedFetch;

  const data = await expectJsonResponse(invokeRoute, 400);

  expect(data.error).toBe("Invalid request body");
  expect(mockedFetch).not.toHaveBeenCalled();
}

export async function expectNonJsonUpstreamError(
  invokeRoute: () => Promise<Response>,
  upstreamResponse: object,
) {
  mockResolvedFetch(upstreamResponse);

  const data = await expectJsonResponse(invokeRoute, 502);

  expect(data.error).toContain("non-JSON response");
}

export async function expectTimeoutError(invokeRoute: () => Promise<Response>) {
  mockRejectedFetch(createTimeoutError());

  const data = await expectJsonResponse(invokeRoute, 504);

  expect(data.error).toBe("Upstream API request timed out");
}

export async function expectFetchError(
  invokeRoute: () => Promise<Response>,
  options: {
    details: string;
    error: string;
  },
) {
  mockRejectedFetch(new Error(options.details));

  const data = await expectJsonResponse(invokeRoute, 500);

  expect(data.error).toBe(options.error);
  expect(data.details).toBe(options.details);
}

export async function expectForwardedJsonError(
  invokeRoute: () => Promise<Response>,
  options: {
    body: object;
    error: string;
    status: number;
  },
) {
  mockResolvedFetch(createJsonFetchResponse(options.body, options.status));

  const data = await expectJsonResponse(invokeRoute, options.status);

  expect(data.error).toBe(options.error);
}

function stubApiRouteEnv(apiEndpoint: string) {
  vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "");
  vi.stubEnv("API_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", apiEndpoint);
  vi.stubEnv("API_KEY", mockApiKey);
}

function stubMissingApiRouteEnv() {
  vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "");
  vi.stubEnv("API_KEY", "");
}
