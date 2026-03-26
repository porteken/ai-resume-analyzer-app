import { describe, expect, it } from "vitest";

import { createErrorResponse, isTimeoutError } from "@/lib/server/api-utils";

describe("api-utils", () => {
  it("creates JSON error responses without details", async () => {
    const response = createErrorResponse("Missing API key", 500);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Missing API key",
    });
  });

  it("creates JSON error responses with details", async () => {
    const response = createErrorResponse(
      "Invalid request body",
      400,
      "Request body must be valid JSON."
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      details: "Request body must be valid JSON.",
      error: "Invalid request body",
    });
  });

  it("detects timeout and abort errors only", () => {
    const abortError = new Error("Request was aborted.");
    abortError.name = "AbortError";
    const timeoutError = new Error("Timed out");
    timeoutError.name = "TimeoutError";

    expect(isTimeoutError(abortError)).toBe(true);
    expect(isTimeoutError(timeoutError)).toBe(true);
    expect(isTimeoutError(new Error("Different failure"))).toBe(false);
    expect(isTimeoutError("TimeoutError")).toBe(false);
  });
});
