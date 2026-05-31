import { getApiConfig } from "@/config/env";
import {
  ANALYZE_TIMEOUT_MS,
  HTTP_STATUS,
  createErrorResponse,
} from "@/lib/server/api-utils";
import { proxyJsonRequest } from "@/lib/server/proxy-utils";
import { parseRequestBody } from "@/lib/server/request-utils";

export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    return createErrorResponse(
      "Server configuration error: Missing API_ENDPOINT (or NEXT_PUBLIC_API_ENDPOINT) or API_KEY",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
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
