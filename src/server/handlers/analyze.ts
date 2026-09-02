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
