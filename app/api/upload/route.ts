import { NextRequest, NextResponse } from "next/server";

import {
  createErrorResponse,
  getApiConfig,
  isTimeoutError,
  UPSTREAM_TIMEOUT_MS,
} from "@/lib/api-utils";
import { validateJobDescription } from "@/lib/job-description";

export const maxDuration = 300;

const getEnvironmentValue = (name: string): string | undefined => {
  if (name === "API_ENDPOINT") return process.env.API_ENDPOINT;
  if (name === "NEXT_PUBLIC_API_ENDPOINT")
    return process.env.NEXT_PUBLIC_API_ENDPOINT;
  if (name === "API_KEY") return process.env.API_KEY;
  if (name === "NEXT_PUBLIC_API_KEY") return process.env.NEXT_PUBLIC_API_KEY;
  return process.env[name];
};

const hasNonEmptyEnvironment = (name: string): boolean => {
  const value = getEnvironmentValue(name);
  return typeof value === "string" && value.trim() !== "";
};

const getSelectedEnvironmentName = (
  preferred: string,
  fallback: string,
): string => {
  if (hasNonEmptyEnvironment(preferred)) {
    return preferred;
  }

  if (hasNonEmptyEnvironment(fallback)) {
    return fallback;
  }

  return "missing";
};

const getEndpointLogValue = (endpoint: string): string => {
  try {
    const parsed = new URL(endpoint);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return endpoint;
  }
};

const parseRequestBody = async (
  request: NextRequest,
): Promise<{
  body: null | Record<string, unknown>;
  error: NextResponse | null;
}> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        body: null,
        error: createErrorResponse(
          "Invalid request body",
          400,
          "Request body must be valid JSON.",
        ),
      };
    }
    throw error;
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      body: null,
      error: createErrorResponse(
        "Invalid request body",
        400,
        "Request body must be a JSON object.",
      ),
    };
  }

  return { body: body as Record<string, unknown>, error: null };
};

const validateBodyJobDescription = (
  body: Record<string, unknown>,
): NextResponse | null => {
  const jobDescription = body.job_description;
  if (typeof jobDescription !== "string") return null;

  const jobDescriptionError = validateJobDescription(jobDescription);
  if (jobDescriptionError) {
    return createErrorResponse(
      "Invalid job description",
      400,
      jobDescriptionError,
    );
  }
  return null;
};

const handleNonJsonResponse = async (
  response: Response,
): Promise<NextResponse> => {
  const text = await response.text();
  console.error("Non-JSON response:", {
    contentType: response.headers.get("content-type"),
    preview: text.slice(0, 200),
    status: response.status,
  });
  return createErrorResponse(
    `External API returned non-JSON response (${response.status}). Check API_ENDPOINT / API_KEY server env vars`,
    502,
    text.slice(0, 200),
  );
};

export async function POST(request: NextRequest) {
  try {
    const apiConfig = getApiConfig();
    if (!apiConfig) {
      return createErrorResponse(
        "Server configuration error: Missing API_ENDPOINT (or NEXT_PUBLIC_API_ENDPOINT) or API_KEY (or NEXT_PUBLIC_API_KEY)",
        500,
      );
    }

    const { body, error: parseError } = await parseRequestBody(request);
    if (parseError) return parseError;

    const jobDescriptionError = validateBodyJobDescription(body!);
    if (jobDescriptionError) return jobDescriptionError;

    const response = await fetch(apiConfig.uploadEndpoint, {
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
      return handleNonJsonResponse(response);
    }

    const data = await response.json();

    console.info("Upload proxy request", {
      apiKeySource: getSelectedEnvironmentName(
        "API_KEY",
        "NEXT_PUBLIC_API_KEY",
      ),
      endpointSource: getSelectedEnvironmentName(
        "API_ENDPOINT",
        "NEXT_PUBLIC_API_ENDPOINT",
      ),
      requestUrl: request.nextUrl.pathname,
      targetEndpoint: getEndpointLogValue(apiConfig.uploadEndpoint),
      upstreamStatus: response.status,
      vercelEnv: process.env.VERCEL_ENV ?? "local",
    });

    if (response.status === 403) {
      const responseMessage =
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message?: unknown }).message === "string"
          ? (data as { message: string }).message
          : undefined;
      console.warn("Upload proxy upstream 403", {
        responseMessage,
        targetEndpoint: getEndpointLogValue(apiConfig.uploadEndpoint),
        vercelEnv: process.env.VERCEL_ENV ?? "local",
      });
    }

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
