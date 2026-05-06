import { isObjectRecord } from "@/lib/type-guards";

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

interface RequestOptions {
  signal?: AbortSignal;
}

const getErrorMessageFromPayload = (payload: unknown): null | string => {
  if (typeof payload === "string" && payload.trim() !== "") {
    return payload;
  }

  if (!isObjectRecord(payload)) {
    return null;
  }

  const error =
    typeof payload.error === "string" && payload.error.trim() !== ""
      ? payload.error
      : null;
  const details =
    typeof payload.details === "string" && payload.details.trim() !== ""
      ? payload.details
      : null;
  const message =
    typeof payload.message === "string" && payload.message.trim() !== ""
      ? payload.message
      : null;

  if (error && details) {
    const separator = /[.!?]$/.test(error) ? " " : ": ";
    return `${error}${separator}${details}`.trim();
  }

  return error ?? details ?? message;
};

const parseErrorPayload = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
};

export class ApiClientError extends Error {
  public readonly data: unknown;
  public readonly method: string;
  public readonly response: Response;
  public readonly status: number;
  public readonly url: string;

  public constructor(options: {
    data: unknown;
    method: string;
    response: Response;
    url: string;
  }) {
    const message =
      getErrorMessageFromPayload(options.data) ??
      `${options.method} ${options.url} failed with status ${options.response.status}`;

    super(message);
    this.name = "ApiClientError";
    this.data = options.data;
    this.method = options.method;
    this.response = options.response;
    this.status = options.response.status;
    this.url = options.url;
  }
}

const request = async (url: string, init: RequestInit): Promise<Response> => {
  const response = await fetch(url, init);

  if (response.ok) {
    return response;
  }

  const method = init.method ?? "GET";
  const data = await parseErrorPayload(response);
  const error = new ApiClientError({
    data,
    method,
    response,
    url,
  });

  throw error;
};

export const postJson = async (
  url: string,
  payload: unknown,
  options?: RequestOptions,
): Promise<Response> =>
  request(url, {
    body: JSON.stringify(payload),
    headers: JSON_HEADERS,
    method: "POST",
    signal: options?.signal,
  });

export const getJson = async (
  url: string,
  options?: RequestOptions,
): Promise<Response> =>
  request(url, {
    method: "GET",
    signal: options?.signal,
  });
