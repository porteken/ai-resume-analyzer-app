"use client";

import { useCallback, useState } from "react";

import {
  type AnalysisResultData,
  pollForResults,
  uploadResume,
  validateFile,
  validateJobDescription,
} from "@/lib/resume-utils";

interface UseResumeAnalysisReturn {
  error: null | string;
  isLoading: boolean;
  result: AnalysisResultData | null;
  statusMessage: string;
  submitAnalysis: (file: File | null, jobDescription: string) => Promise<void>;
}

export const useResumeAnalysis = (): UseResumeAnalysisReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const [error, setError] = useState<null | string>(null);

  const submitAnalysis = useCallback(
    async (file: File | null, jobDescription: string) => {
      const validationError =
        validateFile(file) || validateJobDescription(jobDescription);
      if (validationError) {
        setError(validationError);
        return;
      }

      if (!file) {
        return;
      }

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
        );

        if (uploadData.analysis_result) {
          setResult(uploadData.analysis_result);
        } else if (uploadData.job_id) {
          setStatusMessage("Analyzing Resume...");
          const analysisResult = await pollForResults(
            uploadData.job_id,
            setStatusMessage,
          );
          setResult(analysisResult);
        } else {
          throw new Error(
            "Unexpected response format from server. No job_id or analysis_result found.",
          );
        }
      } catch (error_: unknown) {
        console.error(error_);
        let errorMessage = "An unexpected error occurred.";

        if (error_ instanceof Error) {
          const message = error_.message.toLowerCase();
          if (
            message.includes("failed to fetch") ||
            message.includes("networkerror") ||
            message.includes("abort") ||
            message.includes("load failed") ||
            message.includes("network") ||
            message.includes("cancelled")
          ) {
            errorMessage =
              "Failed to upload resume. Please check your connection and try again.";
          } else if (
            message.includes("server error") ||
            message.includes("internal server error") ||
            message.includes("500")
          ) {
            errorMessage = "Internal server error. Please try again later.";
          } else {
            errorMessage = error_.message;
          }
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
        setStatusMessage("");
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
