import { NextRequest, NextResponse } from "next/server";

import { getApiConfig } from "@/config/env";
import { createErrorResponse, isTimeoutError, UPSTREAM_TIMEOUT_MS } from "@/lib/server/api-utils";
import { handleNonJsonResponse } from "@/lib/server/request-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const apiConfig = getApiConfig();
    if (!apiConfig) {
      return createErrorResponse(
        "Server configuration error: Missing API_ENDPOINT (or NEXT_PUBLIC_API_ENDPOINT) or API_KEY",
        500
      );
    }

    const { jobId } = await params;

    const encodedJobId = encodeURIComponent(jobId);
    const statusUrl = `${apiConfig.statusEndpoint}/${encodedJobId}`;

    const response = await fetch(statusUrl, {
      headers: {
        "x-api-key": apiConfig.apiKey,
      },
      method: "GET",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
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
        `External API did not respond within ${UPSTREAM_TIMEOUT_MS / 1000} seconds`
      );
    }

    console.error("Status API error:", error);
    return createErrorResponse(
      "Failed to check status",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
