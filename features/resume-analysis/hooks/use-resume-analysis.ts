"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  pollForResults,
  uploadResume,
} from "@/features/resume-analysis/api/resume-api";
import { type AnalysisResultData } from "@/features/resume-analysis/types/analysis";
import { validateFile } from "@/features/resume-analysis/utils/file-validation";
import { validateJobDescription } from "@/features/resume-analysis/utils/job-description";

interface UseResumeAnalysisReturn {
  error: null | string;
  isLoading: boolean;
  result: AnalysisResultData | null;
  statusMessage: string;
  submitAnalysis: (file: File | null, jobDescription: string) => Promise<void>;
}

const getSubmitErrorMessage = (error_: unknown): string => {
  if (!(error_ instanceof Error)) {
    return "An unexpected error occurred.";
  }

  const message = error_.message.toLowerCase();
  if (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("abort") ||
    message.includes("load failed") ||
    message.includes("network") ||
    message.includes("cancelled")
  ) {
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

  const submitAnalysis = useCallback(
    async (file: File | null, jobDescription: string) => {
      const validationError =
        validateFile(file) || validateJobDescription(jobDescription);
      if (validationError) {
        setResult(null);
        setStatusMessage("");
        setError(validationError);
        return;
      }

      if (!file) {
        return;
      }

      abortControllerReference.current?.abort();
      const abortController = new AbortController();
      abortControllerReference.current = abortController;

      setIsLoading(true);
      setError(null);
      setResult(null);
      setStatusMessage("Uploading Resume...");

      try {
        setStatusMessage("Uploading Resume...");
        const uploadData = await uploadResume(
          file,
          jobDescription.trim(),
          setStatusMessage,
          { signal: abortController.signal },
        );

        if (uploadData.analysis_result) {
          setResult(uploadData.analysis_result);
        } else if (uploadData.job_id) {
          setStatusMessage("Analyzing Resume...");
          const analysisResult = await pollForResults(
            uploadData.job_id,
            setStatusMessage,
            { signal: abortController.signal },
          );
          setResult(analysisResult);
        } else {
          throw new Error(
            "Unexpected response format from server. No job_id or analysis_result found.",
          );
        }
      } catch (error_: unknown) {
        if (error_ instanceof Error && error_.name === "AbortError") {
          return;
        }

        console.error(error_);
        setError(getSubmitErrorMessage(error_));
      } finally {
        if (abortControllerReference.current === abortController) {
          abortControllerReference.current = null;
          setIsLoading(false);
          setStatusMessage("");
        }
      }
    },
    [],
  );

  return {
    error,
    isLoading,
    result,
    statusMessage,
    submitAnalysis,
  };
};
