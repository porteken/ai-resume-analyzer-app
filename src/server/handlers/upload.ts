import { getApiConfig } from "../../config/env.ts";
import { validateJobDescription } from "../../features/resume-analysis/utils/job-description.ts";
import {
  HTTP_STATUS,
  UPSTREAM_TIMEOUT_MS,
  createErrorResponse,
  createMissingApiConfigResponse,
} from "../../lib/server/api-utils.ts";
import { proxyJsonRequest } from "../../lib/server/proxy-utils.ts";
import { parseRequestBody } from "../../lib/server/request-utils.ts";
import { verifyTurnstileRequest } from "../../lib/server/turnstile.ts";

import type { ApiEnvironment } from "../../config/env.ts";

const validateBodyJobDescription = (
  body: Record<string, unknown>,
): Response | null => {
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

export async function handleUpload(
  request: Request,
  environment?: ApiEnvironment,
): Promise<Response> {
  const apiConfig = getApiConfig(environment);
  if (!apiConfig) {
    return createMissingApiConfigResponse(environment);
  }
  const { body, error: parseError } = await parseRequestBody(request);
  if (parseError) {
    return parseError;
  }

  const jobDescriptionError = validateBodyJobDescription(body);
  if (jobDescriptionError) {
    return jobDescriptionError;
  }

  const turnstileError = await verifyTurnstileRequest(
    body,
    request,
    environment,
  );
  if (turnstileError) {
    return turnstileError;
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
