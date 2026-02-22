import { NextResponse } from "next/server";

export const UPSTREAM_TIMEOUT_MS = 30_000;
export const ANALYZE_TIMEOUT_MS = 60_000;

interface ApiConfig {
  analyzeEndpoint: string;
  apiKey: string;
  statusEndpoint: string;
  uploadEndpoint: string;
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

const deriveBaseEndpoint = (apiEndpoint: string): null | string => {
  try {
    const parsed = new URL(apiEndpoint.trim());
    const pathSegments = parsed.pathname.split("/").filter(Boolean);

    if (pathSegments.length > 0) {
      const lastSegment = pathSegments.at(-1);
      const secondLastSegment =
        pathSegments.length > 1 ? pathSegments.at(-2) : null;

      if (lastSegment === "upload" || lastSegment === "analyze") {
        pathSegments.pop();
      } else if (lastSegment === "status") {
        pathSegments.pop();
      } else if (secondLastSegment === "status") {
        pathSegments.pop();
        pathSegments.pop();
      }
    }

    parsed.pathname = `/${pathSegments.join("/")}`;
    parsed.search = "";
    parsed.hash = "";

    const normalized = parsed.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return null;
  }
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

  const baseEndpoint = deriveBaseEndpoint(apiEndpoint);
  if (!baseEndpoint) {
    console.error("Invalid API endpoint URL:", { apiEndpoint });
    return null;
  }

  const uploadEndpoint = `${baseEndpoint}/upload`;
  const analyzeEndpoint = `${baseEndpoint}/analyze`;
  const statusEndpoint = `${baseEndpoint}/status`;

  return { analyzeEndpoint, apiKey, statusEndpoint, uploadEndpoint };
};

export const isTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TimeoutError";
};
