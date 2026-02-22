import { NextResponse } from "next/server";

export const UPSTREAM_TIMEOUT_MS = 30_000;
export const ANALYZE_TIMEOUT_MS = 60_000;

interface ApiConfig {
  analyzeEndpoint: string;
  apiKey: string;
  statusEndpoint: string;
  uploadEndpoint: string;
}

const getEnvironmentValue = (name: string): string | undefined => {
  if (name === "API_ENDPOINT") return process.env.API_ENDPOINT;
  if (name === "NEXT_PUBLIC_API_ENDPOINT")
    return process.env.NEXT_PUBLIC_API_ENDPOINT;
  if (name === "API_KEY") return process.env.API_KEY;
  if (name === "NEXT_PUBLIC_API_KEY") return process.env.NEXT_PUBLIC_API_KEY;
  return process.env[name];
};

const getFirstNonEmptyEnv = (...names: string[]): null | string => {
  for (const name of names) {
    const value = getEnvironmentValue(name);
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return null;
};

const hasNonEmptyEnv = (name: string): boolean => {
  const value = getEnvironmentValue(name);
  return typeof value === "string" && value.trim() !== "";
};

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
  const apiEndpoint = getFirstNonEmptyEnv(
    "API_ENDPOINT",
    "NEXT_PUBLIC_API_ENDPOINT",
  );
  const apiKey = getFirstNonEmptyEnv("API_KEY", "NEXT_PUBLIC_API_KEY");

  if (!apiEndpoint || !apiKey) {
    console.error("Missing environment variables:", {
      hasApiEndpoint: hasNonEmptyEnv("API_ENDPOINT"),
      hasApiKey: hasNonEmptyEnv("API_KEY"),
      hasPublicApiEndpoint: hasNonEmptyEnv("NEXT_PUBLIC_API_ENDPOINT"),
      hasPublicApiKey: hasNonEmptyEnv("NEXT_PUBLIC_API_KEY"),
    });
    return null;
  }

  if (
    !hasNonEmptyEnv("API_ENDPOINT") &&
    hasNonEmptyEnv("NEXT_PUBLIC_API_ENDPOINT")
  ) {
    console.warn(
      "Using NEXT_PUBLIC_API_ENDPOINT fallback. Prefer API_ENDPOINT for server-side config.",
    );
  }

  if (!hasNonEmptyEnv("API_KEY") && hasNonEmptyEnv("NEXT_PUBLIC_API_KEY")) {
    console.warn(
      "Using NEXT_PUBLIC_API_KEY fallback. Prefer API_KEY for server-only secrets.",
    );
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
