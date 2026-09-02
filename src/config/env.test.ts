import { getApiConfig, getApiConfigDiagnostics } from "@/config/env";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("aPI environment config", () => {
  beforeEach(() => {
    vi.stubEnv("API_ENDPOINT", "");
    vi.stubEnv("API_KEY", "");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("derives endpoints from upload endpoint input", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/prod/upload");
    vi.stubEnv("API_KEY", "test-key");

    const config = getApiConfig();

    expect(config).toStrictEqual({
      analyzeEndpoint: "https://api.example.com/prod/analyze",
      apiKey: "test-key",
      statusEndpoint: "https://api.example.com/prod/status",
      uploadEndpoint: "https://api.example.com/prod/upload",
    });
  });

  it("derives endpoints from status endpoint input", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/prod/status/job-123");
    vi.stubEnv("API_KEY", "test-key");

    const config = getApiConfig();

    expect(config).toStrictEqual({
      analyzeEndpoint: "https://api.example.com/prod/analyze",
      apiKey: "test-key",
      statusEndpoint: "https://api.example.com/prod/status",
      uploadEndpoint: "https://api.example.com/prod/upload",
    });
  });

  it("returns null when API variables are missing", () => {
    expect(getApiConfig()).toBeNull();
  });

  it("derives endpoints from API_ENDPOINT", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/dev/analyze");
    vi.stubEnv("API_KEY", "test-key");

    const config = getApiConfig();

    expect(config).toStrictEqual({
      analyzeEndpoint: "https://api.example.com/dev/analyze",
      apiKey: "test-key",
      statusEndpoint: "https://api.example.com/dev/status",
      uploadEndpoint: "https://api.example.com/dev/upload",
    });
  });

  it("uses API_KEY with API_ENDPOINT", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/dev/analyze");
    vi.stubEnv("API_KEY", "server-only-key");

    const config = getApiConfig();

    expect(config?.apiKey).toBe("server-only-key");
  });

  it("uses an explicitly supplied edge environment", () => {
    const config = getApiConfig({
      API_ENDPOINT: "https://api.example.com/prod/upload",
      API_KEY: "edge-key",
    });

    expect(config).toStrictEqual({
      analyzeEndpoint: "https://api.example.com/prod/analyze",
      apiKey: "edge-key",
      statusEndpoint: "https://api.example.com/prod/status",
      uploadEndpoint: "https://api.example.com/prod/upload",
    });
  });

  it("reports API environment diagnostics", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/dev/analyze");
    vi.stubEnv("API_KEY", "server-only-key");

    const diagnostics = getApiConfigDiagnostics();

    expect(diagnostics.endpointSource).toBe("API_ENDPOINT");
    expect(diagnostics.apiKeySource).toBe("API_KEY");
    expect(diagnostics.endpointForLog).toBe(
      "https://api.example.com/dev/analyze",
    );
  });

  it("reports API key source as missing when API_KEY is absent", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/dev/analyze");

    const diagnostics = getApiConfigDiagnostics();

    expect(diagnostics.apiKeySource).toBe("missing");
    expect(diagnostics.apiKeyFingerprint).toBeNull();
  });

  it("reports API key fingerprint using API_KEY", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/dev/analyze");
    vi.stubEnv("API_KEY", "server-only-key");

    const diagnostics = getApiConfigDiagnostics();

    expect(diagnostics.apiKeySource).toBe("API_KEY");
    expect(diagnostics.apiKeyFingerprint).toBe("len:15..-key");
  });
});
