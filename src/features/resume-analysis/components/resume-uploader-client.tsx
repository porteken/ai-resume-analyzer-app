"use client";

import { AnalysisResult } from "@/features/resume-analysis/components/analysis-result";
import { ResumeUploader } from "@/features/resume-analysis/components/resume-uploader";
import { useResumeAnalysis } from "@/features/resume-analysis/hooks/use-resume-analysis";
import { useEffect, useState } from "react";

export const ResumeUploaderClient = () => {
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
        onFileSelectionSuccess={() => {
          setSelectedFileError(null);
        }}
        onSubmit={submitAnalysis}
        statusMessage={statusMessage}
      />
      <AnalysisResult error={displayedError} result={displayedResult} />
    </>
  );
};
