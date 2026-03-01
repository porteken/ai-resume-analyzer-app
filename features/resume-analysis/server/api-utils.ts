import { NextResponse } from "next/server";

export const UPSTREAM_TIMEOUT_MS = 30_000;
export const ANALYZE_TIMEOUT_MS = 60_000;

export interface ApiConfigDiagnostics {
  apiKeyFingerprint: null | string;
  apiKeySource: ApiKeySource;
  endpointForLog: null | string;
  endpointSource: EndpointSource;
  hasEndpointConflict: boolean;
}

interface ApiConfig {
  analyzeEndpoint: string;
  apiKey: string;
  statusEndpoint: string;
  uploadEndpoint: string;
}

type ApiKeySource = "API_KEY" | "missing";
type EndpointSource = "API_ENDPOINT" | "missing" | "NEXT_PUBLIC_API_ENDPOINT";

const getEnvironmentValue = (name: string): string | undefined => {
  if (name === "API_ENDPOINT") return process.env.API_ENDPOINT;
  if (name === "NEXT_PUBLIC_API_ENDPOINT")
    return process.env.NEXT_PUBLIC_API_ENDPOINT;
  if (name === "API_KEY") return process.env.API_KEY;
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

function getSelectedEnvironmentName(
  preferred: "API_ENDPOINT",
  fallback: "NEXT_PUBLIC_API_ENDPOINT",
): "API_ENDPOINT" | "missing" | "NEXT_PUBLIC_API_ENDPOINT";
function getSelectedEnvironmentName(
  preferred: "API_ENDPOINT",
  fallback: "NEXT_PUBLIC_API_ENDPOINT",
): "API_ENDPOINT" | "missing" | "NEXT_PUBLIC_API_ENDPOINT" {
  if (hasNonEmptyEnv(preferred)) {
    return preferred;
  }

  if (hasNonEmptyEnv(fallback)) {
    return fallback;
  }

  return "missing";
}

const normalizeEnvValue = (name: string): null | string => {
  const value = getEnvironmentValue(name);
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export const getEndpointLogValue = (endpoint: string): string => {
  try {
    const parsed = new URL(endpoint);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return endpoint;
  }
};

const getSecretFingerprint = (value: string): string => {
  const suffix = value.slice(-4);
  return `len:${value.length}..${suffix}`;
};

export const getApiConfigDiagnostics = (): ApiConfigDiagnostics => {
  const apiEndpoint = normalizeEnvValue("API_ENDPOINT");
  const publicApiEndpoint = normalizeEnvValue("NEXT_PUBLIC_API_ENDPOINT");
  const apiKey = normalizeEnvValue("API_KEY");

  const endpointSource = getSelectedEnvironmentName(
    "API_ENDPOINT",
    "NEXT_PUBLIC_API_ENDPOINT",
  );
  const apiKeySource: ApiKeySource = apiKey ? "API_KEY" : "missing";

  let selectedEndpoint: null | string;
  if (endpointSource === "API_ENDPOINT") {
    selectedEndpoint = apiEndpoint;
  } else if (endpointSource === "NEXT_PUBLIC_API_ENDPOINT") {
    selectedEndpoint = publicApiEndpoint;
  } else {
    selectedEndpoint = null;
  }

  const selectedApiKey = apiKeySource === "API_KEY" ? apiKey : null;

  return {
    apiKeyFingerprint: selectedApiKey
      ? getSecretFingerprint(selectedApiKey)
      : null,
    apiKeySource,
    endpointForLog: selectedEndpoint
      ? getEndpointLogValue(selectedEndpoint)
      : null,
    endpointSource,
    hasEndpointConflict:
      apiEndpoint !== null &&
      publicApiEndpoint !== null &&
      apiEndpoint !== publicApiEndpoint,
  };
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
  const apiKey = getFirstNonEmptyEnv("API_KEY");

  if (!apiEndpoint || !apiKey) {
    console.error("Missing environment variables:", {
      hasApiEndpoint: hasNonEmptyEnv("API_ENDPOINT"),
      hasApiKey: hasNonEmptyEnv("API_KEY"),
      hasPublicApiEndpoint: hasNonEmptyEnv("NEXT_PUBLIC_API_ENDPOINT"),
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
