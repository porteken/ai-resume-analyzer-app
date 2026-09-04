import { getApiConfigDiagnostics } from "../../config/env.ts";

import type { ApiEnvironment } from "../../config/env.ts";

export const UPSTREAM_TIMEOUT_MS = 30_000;
export const ANALYZE_TIMEOUT_MS = 60_000;

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  TOO_MANY_REQUESTS: 429,
  BAD_GATEWAY: 502,
  GATEWAY_TIMEOUT: 504,
} as const;

export const MS_PER_SECOND = 1000;

export const createErrorResponse = (
  error: string,
  status: number,
  details?: string,
): Response =>
  Response.json(details ? { details, error } : { error }, {
    status,
  });

export const createMissingApiConfigResponse = (
  environment?: ApiEnvironment,
): Response => {
  console.error(
    "[api] API config resolution failed",
    getApiConfigDiagnostics(environment),
  );

  return createErrorResponse(
    "Server configuration error: Missing API_ENDPOINT or API_KEY",
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  );
};

export const isTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
};
