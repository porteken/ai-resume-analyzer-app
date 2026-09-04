import { useResumeAnalysis } from "@/features/resume-analysis/hooks/use-resume-analysis";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrefetchedUpload } from "@/features/resume-analysis/api/resume-api";
import type * as ResumeApiModule from "@/features/resume-analysis/api/resume-api";

vi.mock("@/features/resume-analysis/api/resume-api", async (importOriginal) => {
  const actual = await importOriginal<typeof ResumeApiModule>();
  return {
    ...actual,
    pollForResults: vi.fn<typeof actual.pollForResults>(),
    prefetchResumeUpload: vi.fn<typeof actual.prefetchResumeUpload>(),
    uploadResume: vi.fn<typeof actual.uploadResume>(),
  };
});

const { pollForResults, prefetchResumeUpload, uploadResume } =
  await import("@/features/resume-analysis/api/resume-api");

const mockedUpload = vi.mocked(uploadResume);
const mockedPoll = vi.mocked(pollForResults);
const mockedPrefetch = vi.mocked(prefetchResumeUpload);

const pdfFile = () =>
  new File(["content"], "resume.pdf", { type: "application/pdf" });

describe("useResumeAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpload.mockResolvedValue({ analysis_result: "done" });
  });

  it("returns initial idle state", () => {
    const { result } = renderHook(() => useResumeAnalysis());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.statusMessage).toBe("");
  });

  it("sets validation error for missing file", async () => {
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(null, "Some job");
    });

    expect(result.current.error).toBeTruthy();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("sets validation error for overlong job description", async () => {
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(pdfFile(), "a".repeat(20_001));
    });

    expect(result.current.error ?? "").toContain("too long");
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it("submits and stores immediate analysis_result", async () => {
    mockedUpload.mockResolvedValueOnce({ analysis_result: "immediate" });
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(pdfFile(), "Engineer");
    });

    expect(result.current.result).toBe("immediate");
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockedUpload).toHaveBeenCalledOnce();
  });

  it("polls when upload returns only job_id", async () => {
    mockedUpload.mockResolvedValueOnce({ job_id: "job-1" });
    mockedPoll.mockResolvedValueOnce("polled-result");
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(pdfFile(), "Engineer");
    });

    expect(mockedPoll).toHaveBeenCalledWith(
      "job-1",
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.result).toBe("polled-result");
  });

  it("maps failed-to-fetch to connection message", async () => {
    mockedUpload.mockRejectedValueOnce(new Error("Failed to fetch"));
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(pdfFile(), "Engineer");
    });

    expect(result.current.error).toContain("check your connection");
  });

  it("maps 500 server error to friendly message", async () => {
    mockedUpload.mockRejectedValueOnce(new Error("Internal Server Error"));
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(pdfFile(), "Engineer");
    });

    expect(result.current.error).toBe(
      "Internal server error. Please try again later.",
    );
  });

  it("maps non-Error throw to unexpected message", async () => {
    mockedUpload.mockRejectedValueOnce("string-failure");
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(pdfFile(), "Engineer");
    });

    expect(result.current.error).toBe("An unexpected error occurred.");
  });

  it("ignores AbortError without setting error", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    mockedUpload.mockRejectedValueOnce(abortError);
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(pdfFile(), "Engineer");
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("throws when server returns neither job_id nor result", async () => {
    mockedUpload.mockResolvedValueOnce({});
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(pdfFile(), "Engineer");
    });

    expect(result.current.error).toContain("Unexpected response format");
  });

  it("cancelAnalysis resets loading state", async () => {
    let resolveUpload!: (value: { job_id: string }) => void;
    mockedUpload.mockImplementationOnce(
      () =>
        new Promise<{ job_id: string }>((resolve) => {
          resolveUpload = resolve;
        }),
    );
    const { result } = renderHook(() => useResumeAnalysis());

    let submitPromise!: Promise<void>;
    act(() => {
      submitPromise = result.current.submitAnalysis(pdfFile(), "Engineer");
    });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.cancelAnalysis();
    });
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      resolveUpload({ job_id: "late" });
      await submitPromise;
    });
  });

  it("prefetchUpload stores promise and skips duplicate file", async () => {
    const prefetched: PrefetchedUpload = { jobId: "job-pf" };
    mockedPrefetch.mockResolvedValue(prefetched);
    const { result } = renderHook(() => useResumeAnalysis());
    const file = pdfFile();

    act(() => {
      result.current.prefetchUpload(file, "tok");
    });
    act(() => {
      result.current.prefetchUpload(file, "tok");
    });

    expect(mockedPrefetch).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockedPrefetch).toHaveBeenCalledWith(
        file,
        expect.any(AbortSignal),
        "tok",
      );
    });
  });

  it("prefetchUpload aborts previous file when file changes", async () => {
    mockedPrefetch.mockImplementation(
      (_file: File, signal?: AbortSignal) =>
        new Promise<PrefetchedUpload>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const { result } = renderHook(() => useResumeAnalysis());

    act(() => {
      result.current.prefetchUpload(pdfFile());
    });
    act(() => {
      result.current.prefetchUpload(
        new File(["x"], "other.pdf", { type: "application/pdf" }),
      );
    });

    expect(mockedPrefetch).toHaveBeenCalledTimes(2);
  });

  it("passes turnstileToken through submitAnalysis", async () => {
    const { result } = renderHook(() => useResumeAnalysis());

    await act(async () => {
      await result.current.submitAnalysis(pdfFile(), "Engineer", {
        turnstileToken: "ts-1",
      });
    });

    expect(mockedUpload).toHaveBeenCalledWith(
      expect.any(File),
      "Engineer",
      expect.any(Function),
      expect.objectContaining({ turnstileToken: "ts-1" }),
    );
  });
});
