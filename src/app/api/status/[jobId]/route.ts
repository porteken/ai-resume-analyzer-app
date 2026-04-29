import { getApiConfig } from "@/config/env";
import {
  HTTP_STATUS,
  MS_PER_SECOND,
  UPSTREAM_TIMEOUT_MS,
  createErrorResponse,
  isTimeoutError,
} from "@/lib/server/api-utils";
import { handleNonJsonResponse } from "@/lib/server/request-utils";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const apiConfig = getApiConfig();
    if (!apiConfig) {
      return createErrorResponse(
        "Server configuration error: Missing API_ENDPOINT (or NEXT_PUBLIC_API_ENDPOINT) or API_KEY",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
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
        HTTP_STATUS.GATEWAY_TIMEOUT,
        `External API did not respond within ${UPSTREAM_TIMEOUT_MS / MS_PER_SECOND} seconds`,
      );
    }

    return createErrorResponse(
      "Failed to check status",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
