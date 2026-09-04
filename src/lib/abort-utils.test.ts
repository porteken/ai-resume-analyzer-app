import { describe, expect, it } from "vitest";

import { createAbortError, throwIfAborted } from "./abort-utils";

describe("abort-utils", () => {
  it("creates a DOMException named AbortError", () => {
    const error = createAbortError();

    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe("AbortError");
  });

  it("does not throw when signal is missing", () => {
    expect(() => {
      throwIfAborted();
    }).not.toThrow();
  });

  it("does not throw when signal is not aborted", () => {
    const controller = new AbortController();

    expect(() => {
      throwIfAborted(controller.signal);
    }).not.toThrow();
  });

  it("throws AbortError when signal is aborted", () => {
    const controller = new AbortController();
    controller.abort();

    expect(() => {
      throwIfAborted(controller.signal);
    }).toThrowError(expect.objectContaining({ name: "AbortError" }));
  });
});
