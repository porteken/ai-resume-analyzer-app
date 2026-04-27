import { afterEach, describe, expect, it, vi } from "vitest";

import { sleep } from "@/features/resume-analysis/utils/sleep";

describe("sleep", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after the requested delay", async () => {
    vi.useFakeTimers();

    const onResolved = vi.fn<() => void>();
    const promise = sleep(100).then(onResolved);

    await vi.advanceTimersByTimeAsync(99);
    expect(onResolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBeUndefined();
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const abortController = new AbortController();
    abortController.abort();

    await expect(sleep(100, abortController.signal)).rejects.toMatchObject({
      message: "Request was aborted.",
      name: "AbortError",
    });
  });

  it("rejects when the signal aborts before the timeout finishes", async () => {
    vi.useFakeTimers();

    const abortController = new AbortController();
    const promise = sleep(100, abortController.signal);

    abortController.abort();

    await expect(promise).rejects.toMatchObject({
      message: "Request was aborted.",
      name: "AbortError",
    });
  });
});
