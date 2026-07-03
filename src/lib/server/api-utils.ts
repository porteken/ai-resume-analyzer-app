import { getApiConfigDiagnostics } from "@/config/env";
import { NextResponse } from "next/server";

export const UPSTREAM_TIMEOUT_MS = 30_000;
export const ANALYZE_TIMEOUT_MS = 60_000;

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  GATEWAY_TIMEOUT: 504,
} as const;

export const MS_PER_SECOND = 1000;

export const createErrorResponse = (
  error: string,
  status: number,
  details?: string,
): NextResponse =>
  NextResponse.json(details ? { details, error } : { error }, {
    status,
  });

export const createMissingApiConfigResponse = (): NextResponse => {
  console.error(
    "[api] API config resolution failed",
    getApiConfigDiagnostics(),
  );

  return createErrorResponse(
    "Server configuration error: Missing API_ENDPOINT (or NEXT_PUBLIC_API_ENDPOINT) or API_KEY",
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  );
};

let warnedLegacyEndpoint = false;

export const warnIfLegacyEndpointSource = (): void => {
  if (warnedLegacyEndpoint) {
    return;
  }

  const diagnostics = getApiConfigDiagnostics();

  if (
    diagnostics.endpointSource === "NEXT_PUBLIC_API_ENDPOINT" ||
    diagnostics.hasEndpointConflict
  ) {
    warnedLegacyEndpoint = true;
    console.warn(
      "[api] Using NEXT_PUBLIC_API_ENDPOINT fallback; set server-only API_ENDPOINT instead (NEXT_PUBLIC_* variables are exposed in the client bundle)",
      diagnostics,
    );
  }
};

export const isTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
};
