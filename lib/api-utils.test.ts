import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getApiConfig } from "@/lib/api-utils";

describe("getApiConfig", () => {
  beforeEach(() => {
    vi.stubEnv("API_ENDPOINT", "");
    vi.stubEnv("API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "");
    vi.stubEnv("NEXT_PUBLIC_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("derives endpoints from upload endpoint input", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_ENDPOINT",
      "https://api.example.com/prod/upload",
    );
    vi.stubEnv("NEXT_PUBLIC_API_KEY", "test-key");

    const config = getApiConfig();

    expect(config).toEqual({
      analyzeEndpoint: "https://api.example.com/prod/analyze",
      apiKey: "test-key",
      statusEndpoint: "https://api.example.com/prod/status",
      uploadEndpoint: "https://api.example.com/prod/upload",
    });
  });

  it("derives endpoints from analyze endpoint input", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_ENDPOINT",
      "https://api.example.com/prod/analyze",
    );
    vi.stubEnv("NEXT_PUBLIC_API_KEY", "test-key");

    const config = getApiConfig();

    expect(config).toEqual({
      analyzeEndpoint: "https://api.example.com/prod/analyze",
      apiKey: "test-key",
      statusEndpoint: "https://api.example.com/prod/status",
      uploadEndpoint: "https://api.example.com/prod/upload",
    });
  });

  it("derives endpoints from status endpoint input", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_ENDPOINT",
      "https://api.example.com/prod/status/job-123",
    );
    vi.stubEnv("NEXT_PUBLIC_API_KEY", "test-key");

    const config = getApiConfig();

    expect(config).toEqual({
      analyzeEndpoint: "https://api.example.com/prod/analyze",
      apiKey: "test-key",
      statusEndpoint: "https://api.example.com/prod/status",
      uploadEndpoint: "https://api.example.com/prod/upload",
    });
  });

  it("returns null when API variables are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "");
    vi.stubEnv("NEXT_PUBLIC_API_KEY", "");

    expect(getApiConfig()).toBeNull();
  });

  it("uses API_ENDPOINT when NEXT_PUBLIC_API_ENDPOINT is not set", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/dev/analyze");
    vi.stubEnv("NEXT_PUBLIC_API_KEY", "test-key");

    const config = getApiConfig();

    expect(config).toEqual({
      analyzeEndpoint: "https://api.example.com/dev/analyze",
      apiKey: "test-key",
      statusEndpoint: "https://api.example.com/dev/status",
      uploadEndpoint: "https://api.example.com/dev/upload",
    });
  });

  it("uses API_ENDPOINT when NEXT_PUBLIC_API_ENDPOINT is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_API_ENDPOINT", "");
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/dev/analyze");
    vi.stubEnv("NEXT_PUBLIC_API_KEY", "test-key");

    const config = getApiConfig();

    expect(config?.analyzeEndpoint).toBe("https://api.example.com/dev/analyze");
  });

  it("prefers API_ENDPOINT over NEXT_PUBLIC_API_ENDPOINT", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_ENDPOINT",
      "https://api.example.com/prod/analyze",
    );
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/dev/analyze");
    vi.stubEnv("NEXT_PUBLIC_API_KEY", "test-key");

    const config = getApiConfig();

    expect(config?.analyzeEndpoint).toBe("https://api.example.com/dev/analyze");
  });

  it("uses API_KEY when NEXT_PUBLIC_API_KEY is not set", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_ENDPOINT",
      "https://api.example.com/dev/analyze",
    );
    vi.stubEnv("API_KEY", "server-only-key");

    const config = getApiConfig();

    expect(config?.apiKey).toBe("server-only-key");
  });

  it("prefers API_KEY over NEXT_PUBLIC_API_KEY", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_ENDPOINT",
      "https://api.example.com/dev/analyze",
    );
    vi.stubEnv("API_KEY", "server-only-key");
    vi.stubEnv("NEXT_PUBLIC_API_KEY", "public-key");

    const config = getApiConfig();

    expect(config?.apiKey).toBe("server-only-key");
  });
});
