type ApiConfig = {
  analyzeEndpoint: string;
  apiKey: string;
  statusEndpoint: string;
  uploadEndpoint: string;
};

type ApiConfigDiagnostics = {
  apiKeyFingerprint: null | string;
  apiKeySource: ApiKeySource;
  endpointForLog: null | string;
  endpointSource: EndpointSource;
  hasEndpointConflict: boolean;
};

type ApiKeySource = "API_KEY" | "missing";
type EndpointSource = "API_ENDPOINT" | "missing" | "NEXT_PUBLIC_API_ENDPOINT";

const getEnvironmentValue = (name: string): string | undefined => {
  if (name === "API_ENDPOINT") {
    return process.env.API_ENDPOINT;
  }

  if (name === "NEXT_PUBLIC_API_ENDPOINT") {
    return process.env.NEXT_PUBLIC_API_ENDPOINT;
  }

  if (name === "API_KEY") {
    return process.env.API_KEY;
  }

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

const getSelectedEnvironmentName = (): EndpointSource => {
  if (hasNonEmptyEnv("API_ENDPOINT")) {
    return "API_ENDPOINT";
  }

  if (hasNonEmptyEnv("NEXT_PUBLIC_API_ENDPOINT")) {
    return "NEXT_PUBLIC_API_ENDPOINT";
  }

  return "missing";
};

const normalizeEnvValue = (name: string): null | string => {
  const value = getEnvironmentValue(name);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const deriveBaseEndpoint = (apiEndpoint: string): null | string => {
  try {
    const parsed = new URL(apiEndpoint.trim());
    const pathSegments = parsed.pathname.split("/").filter(Boolean);

    if (pathSegments.length > 0) {
      const lastSegment = pathSegments.at(-1);
      const SECOND_LAST_INDEX = -2;
      const secondLastSegment =
        pathSegments.length > 1 ? pathSegments.at(SECOND_LAST_INDEX) : null;

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

const getSecretFingerprint = (value: string): string => {
  const SUFFIX_LENGTH = -4;
  const suffix = value.slice(SUFFIX_LENGTH);
  return `len:${value.length}..${suffix}`;
};

const getEndpointLogValue = (endpoint: string): string => {
  try {
    const parsed = new URL(endpoint);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return endpoint;
  }
};

export const getApiConfigDiagnostics = (): ApiConfigDiagnostics => {
  const apiEndpoint = normalizeEnvValue("API_ENDPOINT");
  const publicApiEndpoint = normalizeEnvValue("NEXT_PUBLIC_API_ENDPOINT");
  const apiKey = normalizeEnvValue("API_KEY");

  const endpointSource = getSelectedEnvironmentName();
  const apiKeySource: ApiKeySource = apiKey ? "API_KEY" : "missing";

  let selectedEndpoint: null | string = null;

  if (endpointSource === "API_ENDPOINT") {
    selectedEndpoint = apiEndpoint;
  } else if (endpointSource === "NEXT_PUBLIC_API_ENDPOINT") {
    selectedEndpoint = publicApiEndpoint;
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

export const getApiConfig = (): ApiConfig | null => {
  const apiEndpoint = getFirstNonEmptyEnv(
    "API_ENDPOINT",
    "NEXT_PUBLIC_API_ENDPOINT",
  );
  const apiKey = getFirstNonEmptyEnv("API_KEY");

  if (!apiEndpoint || !apiKey) {
    return null;
  }

  const baseEndpoint = deriveBaseEndpoint(apiEndpoint);

  if (!baseEndpoint) {
    return null;
  }

  return {
    analyzeEndpoint: `${baseEndpoint}/analyze`,
    apiKey,
    statusEndpoint: `${baseEndpoint}/status`,
    uploadEndpoint: `${baseEndpoint}/upload`,
  };
};
