import { getApiConfig } from "../../config/env";
import {
  ANALYZE_TIMEOUT_MS,
  createMissingApiConfigResponse,
} from "../../lib/server/api-utils";
import { proxyJsonRequest } from "../../lib/server/proxy-utils";
import { parseRequestBody } from "../../lib/server/request-utils";

import type { ApiEnvironment } from "../../config/env";

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
