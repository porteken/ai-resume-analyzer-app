import {
  HTTP_STATUS,
  MS_PER_SECOND,
  createErrorResponse,
  isTimeoutError,
} from "@/lib/server/api-utils";
import { handleNonJsonResponse } from "@/lib/server/request-utils";
import { NextResponse } from "next/server";

interface ProxyJsonRequestOptions {
  body?: unknown;
  failureMessage: string;
  headers: HeadersInit;
  method: "GET" | "POST";
  timeoutMs: number;
  url: string;
}

export const proxyJsonRequest = async ({
  body,
  failureMessage,
  headers,
  method,
  timeoutMs,
  url,
}: ProxyJsonRequestOptions): Promise<Response> => {
  try {
    const response = await fetch(url, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers,
      method,
      signal: AbortSignal.timeout(timeoutMs),
    });

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return handleNonJsonResponse(response);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (isTimeoutError(error)) {
      return createErrorResponse(
        "Upstream API request timed out",
        HTTP_STATUS.GATEWAY_TIMEOUT,
        `External API did not respond within ${timeoutMs / MS_PER_SECOND} seconds`,
      );
    }

    return createErrorResponse(
      failureMessage,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};
