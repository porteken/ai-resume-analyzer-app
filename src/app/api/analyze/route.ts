import { getApiConfig } from "@/config/env";
import {
  ANALYZE_TIMEOUT_MS,
  createErrorResponse,
  isTimeoutError,
} from "@/lib/server/api-utils";
import {
  handleNonJsonResponse,
  parseRequestBody,
} from "@/lib/server/request-utils";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const apiConfig = getApiConfig();
    if (!apiConfig) {
      return createErrorResponse(
        "Server configuration error: Missing API_ENDPOINT (or NEXT_PUBLIC_API_ENDPOINT) or API_KEY",
        500,
      );
    }

    const { body, error: parseError } = await parseRequestBody(request);
    if (parseError) return parseError;

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
        504,
        `External API did not respond within ${ANALYZE_TIMEOUT_MS / 1000} seconds`,
      );
    }

    return createErrorResponse(
      "Failed to analyze resume",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
