import { getApiConfig } from "@/config/env";
import { validateJobDescription } from "@/features/resume-analysis/utils/job-description";
import {
  HTTP_STATUS,
  UPSTREAM_TIMEOUT_MS,
  createErrorResponse,
  createMissingApiConfigResponse,
  warnIfLegacyEndpointSource,
} from "@/lib/server/api-utils";
import { proxyJsonRequest } from "@/lib/server/proxy-utils";
import { parseRequestBody } from "@/lib/server/request-utils";

import type { NextResponse } from "next/server";

export const maxDuration = 300;

const validateBodyJobDescription = (
  body: Record<string, unknown>,
): NextResponse | null => {
  const jobDescription = body.job_description;
  if (typeof jobDescription !== "string") {
    return null;
  }

  const jobDescriptionError = validateJobDescription(jobDescription);
  if (jobDescriptionError) {
    return createErrorResponse(
      "Invalid job description",
      HTTP_STATUS.BAD_REQUEST,
      jobDescriptionError,
    );
  }
  return null;
};

export async function POST(request: Request): Promise<Response> {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    return createMissingApiConfigResponse();
  }
  warnIfLegacyEndpointSource();

  const { body, error: parseError } = await parseRequestBody(request);
  if (parseError) {
    return parseError;
  }

  const jobDescriptionError = validateBodyJobDescription(body);
  if (jobDescriptionError) {
    return jobDescriptionError;
  }

  return proxyJsonRequest({
    body,
    failureMessage: "Failed to upload resume",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiConfig.apiKey,
    },
    method: "POST",
    timeoutMs: UPSTREAM_TIMEOUT_MS,
    url: apiConfig.uploadEndpoint,
  });
}
