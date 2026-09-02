import { getApiConfig } from "../../config/env";
import {
  UPSTREAM_TIMEOUT_MS,
  createMissingApiConfigResponse,
} from "../../lib/server/api-utils";
import { proxyJsonRequest } from "../../lib/server/proxy-utils";

import type { ApiEnvironment } from "../../config/env";

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
