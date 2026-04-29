import { getApiConfig } from "@/config/env";
import {
  ANALYZE_TIMEOUT_MS,
  HTTP_STATUS,
  MS_PER_SECOND,
  createErrorResponse,
  isTimeoutError,
} from "@/lib/server/api-utils";
import {
  handleNonJsonResponse,
  parseRequestBody,
} from "@/lib/server/request-utils";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    const apiConfig = getApiConfig();
    if (!apiConfig) {
      return createErrorResponse(
        "Server configuration error: Missing API_ENDPOINT (or NEXT_PUBLIC_API_ENDPOINT) or API_KEY",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }

    const { body, error: parseError } = await parseRequestBody(request);
    if (parseError) {
      return parseError;
    }

    const response = await fetch(apiConfig.analyzeEndpoint, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiConfig.apiKey,
      },
      method: "POST",
      signal: AbortSignal.timeout(ANALYZE_TIMEOUT_MS),
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
        `External API did not respond within ${ANALYZE_TIMEOUT_MS / MS_PER_SECOND} seconds`,
      );
    }

    return createErrorResponse(
      "Failed to analyze resume",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
