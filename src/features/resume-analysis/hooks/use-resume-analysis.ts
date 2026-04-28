"use client";

import {
  pollForResults,
  uploadResume,
} from "@/features/resume-analysis/api/resume-api";
import { validateFile } from "@/features/resume-analysis/utils/file-validation";
import { validateJobDescription } from "@/features/resume-analysis/utils/job-description";
import { ApiClientError } from "@/lib/api-client";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AnalysisResultData } from "@/types";

type UseResumeAnalysisReturn = {
  cancelAnalysis: () => void;
  error: null | string;
  isLoading: boolean;
  result: AnalysisResultData | null;
  statusMessage: string;
  submitAnalysis: (file: File | null, jobDescription: string) => Promise<void>;
};

const isApiResponseError = (error_: Error): boolean => {
  if (error_ instanceof ApiClientError) {
    return true;
  }

  return (
    (error_ as Error & { cause?: unknown }).cause instanceof ApiClientError
  );
};

const isBrowserNetworkError = (error_: Error): boolean => {
  if (isApiResponseError(error_)) {
    return false;
  }

  const message = error_.message.trim().toLowerCase();

  return (
    message === "failed to fetch" ||
    message.includes("networkerror when attempting to fetch resource") ||
    message.includes("load failed")
  );
};

const getSubmitErrorMessage = (error_: unknown): string => {
  if (!(error_ instanceof Error)) {
    return "An unexpected error occurred.";
  }

  const message = error_.message.toLowerCase();
  if (isBrowserNetworkError(error_)) {
    return "Failed to upload resume. Please check your connection and try again.";
  }

  if (
    message.includes("server error") ||
    message.includes("internal server error") ||
    message.includes("500")
  ) {
    return "Internal server error. Please try again later.";
  }

  return error_.message;
};

export const useResumeAnalysis = (): UseResumeAnalysisReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const [error, setError] = useState<null | string>(null);
  const abortControllerReference = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortControllerReference.current?.abort();
    },
    [],
  );

  const resetForValidationError = (validationError: string) => {
    setResult(null);
    setStatusMessage("");
    setError(validationError);
  };

  const cancelAnalysis = useCallback(() => {
    const abortController = abortControllerReference.current;

    if (!abortController) {
      return;
    }

    abortControllerReference.current = null;
    abortController.abort();
    setIsLoading(false);
    setStatusMessage("");
    setError(null);
  }, []);

  const startRequest = (): AbortController => {
    abortControllerReference.current?.abort();
    const abortController = new AbortController();
    abortControllerReference.current = abortController;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusMessage("Uploading Resume...");
    return abortController;
  };

  const finishRequest = (abortController: AbortController) => {
    if (abortControllerReference.current === abortController) {
      abortControllerReference.current = null;
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  const runAnalysis = async (
    file: File,
    jobDescription: string,
    abortController: AbortController,
  ) => {
    const uploadData = await uploadResume(
      file,
      jobDescription.trim(),
      setStatusMessage,
      {
        signal: abortController.signal,
      },
    );

    if (uploadData.analysis_result) {
      setResult(uploadData.analysis_result);
      return;
    }

    if (!uploadData.job_id) {
      throw new Error(
        "Unexpected response format from server. No job_id or analysis_result found.",
      );
    }

    setStatusMessage("Analyzing Resume...");
    const analysisResult = await pollForResults(
      uploadData.job_id,
      setStatusMessage,
      {
        signal: abortController.signal,
      },
    );
    setResult(analysisResult);
  };

  const submitAnalysis = useCallback(
    async (file: File | null, jobDescription: string) => {
      const validationError =
        validateFile(file) || validateJobDescription(jobDescription);
      if (validationError) {
        resetForValidationError(validationError);
        return;
      }

      if (!file) {
        return;
      }

      const abortController = startRequest();

      try {
        await runAnalysis(file, jobDescription, abortController);
      } catch (error_: unknown) {
        if (error_ instanceof Error && error_.name === "AbortError") {
          return;
        }

        setError(getSubmitErrorMessage(error_));
      } finally {
        finishRequest(abortController);
      }
    },
    [],
  );

  return {
    cancelAnalysis,
    error,
    isLoading,
    result,
    statusMessage,
    submitAnalysis,
  };
};
