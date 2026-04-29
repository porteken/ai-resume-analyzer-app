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

export const isTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
};
