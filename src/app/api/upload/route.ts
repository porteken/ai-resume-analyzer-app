import { NextRequest, NextResponse } from "next/server";

import { getApiConfig, getApiConfigDiagnostics, getEndpointLogValue } from "@/config/env";
import { validateJobDescription } from "@/features/resume-analysis/utils/job-description";
import { createErrorResponse, isTimeoutError, UPSTREAM_TIMEOUT_MS } from "@/lib/server/api-utils";
import { handleNonJsonResponse, parseRequestBody } from "@/lib/server/request-utils";

export const maxDuration = 300;

const validateBodyJobDescription = (body: Record<string, unknown>): NextResponse | null => {
  const jobDescription = body.job_description;
  if (typeof jobDescription !== "string") return null;

  const jobDescriptionError = validateJobDescription(jobDescription);
  if (jobDescriptionError) {
    return createErrorResponse("Invalid job description", 400, jobDescriptionError);
  }
  return null;
};

const warnOnForbiddenUpstreamResponse = (
  response: Response,
  data: unknown,
  apiConfigDiagnostics: ReturnType<typeof getApiConfigDiagnostics>,
  uploadEndpoint: string
): void => {
  if (response.status !== 403) return;

  const responseMessage =
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as { message?: unknown }).message === "string"
      ? (data as { message: string }).message
      : undefined;

  const responseHeaders: Record<string, string> = {};
  for (const [key, value] of response.headers.entries()) {
    responseHeaders[key] = value;
  }

  console.warn("Upload proxy upstream 403", {
    apiConfigDiagnostics,
    responseHeaders,
    responseMessage,
    targetEndpoint: getEndpointLogValue(uploadEndpoint),
    vercelEnv: process.env.VERCEL_ENV ?? "local",
  });
};

export async function POST(request: NextRequest) {
  try {
    const apiConfig = getApiConfig();
    const apiConfigDiagnostics = getApiConfigDiagnostics();
    if (!apiConfig) {
      return createErrorResponse(
        "Server configuration error: Missing API_ENDPOINT (or NEXT_PUBLIC_API_ENDPOINT) or API_KEY",
        500
      );
    }

    const { body, error: parseError } = await parseRequestBody(request);
    if (parseError) return parseError;

    const jobDescriptionError = validateBodyJobDescription(body!);
    if (jobDescriptionError) return jobDescriptionError;

    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiConfig.apiKey,
    };

    const response = await fetch(apiConfig.uploadEndpoint, {
      body: JSON.stringify(body),
      headers,
      method: "POST",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return handleNonJsonResponse(response);
    }

    const data = await response.json();

    warnOnForbiddenUpstreamResponse(response, data, apiConfigDiagnostics, apiConfig.uploadEndpoint);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (isTimeoutError(error)) {
      return createErrorResponse(
        "Upstream API request timed out",
        504,
        `External API did not respond within ${UPSTREAM_TIMEOUT_MS / 1000} seconds`
      );
    }

    console.error("Upload API error:", error);
    return createErrorResponse(
      "Failed to upload resume",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
