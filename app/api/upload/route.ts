import { NextRequest, NextResponse } from "next/server";

import {
  createErrorResponse,
  getApiConfig,
  isTimeoutError,
  UPSTREAM_TIMEOUT_MS,
} from "@/lib/api-utils";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const apiConfig = getApiConfig();
    if (!apiConfig) {
      return createErrorResponse(
        "Server configuration error: Missing API_ENDPOINT or API_KEY in .env.local",
        500,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(
          "Invalid request body",
          400,
          "Request body must be valid JSON.",
        );
      }

      throw error;
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return createErrorResponse(
        "Invalid request body",
        400,
        "Request body must be a JSON object.",
      );
    }

    const response = await fetch(apiConfig.apiEndpoint, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiConfig.apiKey,
      },
      method: "POST",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response:", {
        contentType,
        preview: text.slice(0, 200),
        status: response.status,
      });
      return createErrorResponse(
        `External API returned non-JSON response (${response.status}). Check API_ENDPOINT in .env.local`,
        502,
        text.slice(0, 200),
      );
    }

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (isTimeoutError(error)) {
      return createErrorResponse(
        "Upstream API request timed out",
        504,
        `External API did not respond within ${UPSTREAM_TIMEOUT_MS / 1000} seconds`,
      );
    }

    console.error("Upload API error:", error);
    return createErrorResponse(
      "Failed to upload resume",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
