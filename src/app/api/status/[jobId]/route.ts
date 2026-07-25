import { getApiConfig } from "@/config/env";
import {
  UPSTREAM_TIMEOUT_MS,
  createMissingApiConfigResponse,
  warnIfLegacyEndpointSource,
} from "@/lib/server/api-utils";
import { proxyJsonRequest } from "@/lib/server/proxy-utils";

export const maxDuration = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  const apiConfig = getApiConfig();
  if (!apiConfig) {
    return createMissingApiConfigResponse();
  }
  warnIfLegacyEndpointSource();

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
