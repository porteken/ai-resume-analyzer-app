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
    return `${error} ${details}`.trim();
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
  readonly data: unknown;
  readonly method: string;
  readonly response: Response;
  readonly status: number;
  readonly url: string;

  constructor(options: {
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

  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_E2E_TEST !== "1"
  ) {
    console.error("API client request failed", {
      data,
      method,
      status: response.status,
      url,
    });
  }

  throw error;
};

export const postJson = (
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

export const getJson = (
  url: string,
  options?: RequestOptions,
): Promise<Response> =>
  request(url, {
    method: "GET",
    signal: options?.signal,
  });
