import { getApiConfig } from "@/config/env";
import {
  HTTP_STATUS,
  UPSTREAM_TIMEOUT_MS,
  createErrorResponse,
} from "@/lib/server/api-utils";
import { proxyJsonRequest } from "@/lib/server/proxy-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    return createErrorResponse(
      "Server configuration error: Missing API_ENDPOINT (or NEXT_PUBLIC_API_ENDPOINT) or API_KEY",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }

  const { jobId } = await params;
  const encodedJobId = encodeURIComponent(jobId);

  return proxyJsonRequest({
    failureMessage: "Failed to check status",
    headers: {
      "x-api-key": apiConfig.apiKey,
    },
    method: "GET",
    timeoutMs: UPSTREAM_TIMEOUT_MS,
    url: `${apiConfig.statusEndpoint}/${encodedJobId}`,
  });
}
