import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiConfig } from "@/lib/api-utils";

describe("getApiConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("derives endpoints from upload endpoint input", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/prod/upload");
    vi.stubEnv("API_KEY", "test-key");

    const config = getApiConfig();

    expect(config).toEqual({
      analyzeEndpoint: "https://api.example.com/prod/analyze",
      apiKey: "test-key",
      statusEndpoint: "https://api.example.com/prod/status",
      uploadEndpoint: "https://api.example.com/prod/upload",
    });
  });

  it("derives endpoints from analyze endpoint input", () => {
    vi.stubEnv("API_ENDPOINT", "https://api.example.com/prod/analyze");
    vi.stubEnv("API_KEY", "test-key");

    const config = getApiConfig();

    expect(config).toEqual({
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

    expect(config).toEqual({
      analyzeEndpoint: "https://api.example.com/prod/analyze",
      apiKey: "test-key",
      statusEndpoint: "https://api.example.com/prod/status",
      uploadEndpoint: "https://api.example.com/prod/upload",
    });
  });

  it("returns null when API variables are missing", () => {
    vi.stubEnv("API_ENDPOINT", "");
    vi.stubEnv("API_KEY", "");

    expect(getApiConfig()).toBeNull();
  });
});
