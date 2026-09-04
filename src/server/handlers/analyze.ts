import { getApiConfig } from "../../config/env.ts";
import {
  ANALYZE_TIMEOUT_MS,
  createMissingApiConfigResponse,
} from "../../lib/server/api-utils.ts";
import { proxyJsonRequest } from "../../lib/server/proxy-utils.ts";
import { parseRequestBody } from "../../lib/server/request-utils.ts";

import type { ApiEnvironment } from "../../config/env.ts";

export async function handleAnalyze(
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

  // Turnstile is verified once on /api/upload (which mints the job + presigned
  // URL). /api/analyze reuses the same client token, but Turnstile tokens are
  // single-use — a second siteverify would fail with timeout-or-duplicate.
  // Trust the job chain here (analyze validates s3 location against the Dynamo
  // record created by the verified upload) and never proxy the token to AWS.
  delete body.turnstileToken;

  return proxyJsonRequest({
    body,
    failureMessage: "Failed to analyze resume",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiConfig.apiKey,
    },
    method: "POST",
    timeoutMs: ANALYZE_TIMEOUT_MS,
    url: apiConfig.analyzeEndpoint,
  });
}
