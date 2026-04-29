"use client";

import { AnalysisResult } from "@/features/resume-analysis/components/analysis-result";
import { ResumeUploader } from "@/features/resume-analysis/components/resume-uploader";
import { useResumeAnalysis } from "@/features/resume-analysis/hooks/use-resume-analysis";
import { useCallback, useEffect, useState } from "react";

import type { JSX } from "react";

export const ResumeUploaderClient = (): JSX.Element | null => {
  const [isMounted, setIsMounted] = useState(process.env.NODE_ENV === "test");
  const [selectedFileError, setSelectedFileError] = useState<null | string>(
    null,
  );
  const {
    cancelAnalysis,
    error,
    isLoading,
    result,
    statusMessage,
    submitAnalysis,
  } = useResumeAnalysis();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleFileSelectionSuccess = useCallback(() => {
    setSelectedFileError(null);
  }, []);

  if (!isMounted) {
    return null;
  }

  const displayedError = selectedFileError ?? error;
  const displayedResult = selectedFileError ? null : result;

  return (
    <>
      <ResumeUploader
        isLoading={isLoading}
        onCancel={cancelAnalysis}
        onFileSelectionError={setSelectedFileError}
        onFileSelectionSuccess={handleFileSelectionSuccess}
        onSubmit={submitAnalysis}
        statusMessage={statusMessage}
      />
      <AnalysisResult error={displayedError} result={displayedResult} />
    </>
  );
};
