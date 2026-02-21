import { NextResponse } from "next/server";

export const UPSTREAM_TIMEOUT_MS = 30_000;

interface ApiConfig {
  apiEndpoint: string;
  apiKey: string;
}

export const createErrorResponse = (
  error: string,
  status: number,
  details?: string,
) => {
  return NextResponse.json(details ? { details, error } : { error }, {
    status,
  });
};

export const getApiConfig = (): ApiConfig | null => {
  const apiEndpoint = process.env.API_ENDPOINT;
  const apiKey = process.env.API_KEY;

  if (!apiEndpoint || !apiKey) {
    console.error("Missing environment variables:", {
      hasEndpoint: !!apiEndpoint,
      hasKey: !!apiKey,
    });
    return null;
  }

  return { apiEndpoint, apiKey };
};

export const isTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
};
