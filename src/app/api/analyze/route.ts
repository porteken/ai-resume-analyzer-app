import { getApiConfig } from "@/config/env";
import {
  ANALYZE_TIMEOUT_MS,
  createMissingApiConfigResponse,
  warnIfLegacyEndpointSource,
} from "@/lib/server/api-utils";
import { proxyJsonRequest } from "@/lib/server/proxy-utils";
import { parseRequestBody } from "@/lib/server/request-utils";

export const maxDuration = 300;

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
