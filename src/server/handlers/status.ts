import { getApiConfig } from "../../config/env.ts";
import {
  UPSTREAM_TIMEOUT_MS,
  createMissingApiConfigResponse,
} from "../../lib/server/api-utils.ts";
import { proxyJsonRequest } from "../../lib/server/proxy-utils.ts";

import type { ApiEnvironment } from "../../config/env.ts";

export async function handleStatus(
  _request: Request,
  jobId: string,
  environment?: ApiEnvironment,
): Promise<Response> {
  const apiConfig = getApiConfig(environment);
  if (!apiConfig) {
    return createMissingApiConfigResponse(environment);
  }
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
