"use client";

import { AnalysisResult } from "@/features/resume-analysis/components/analysis-result";
import { ResumeUploader } from "@/features/resume-analysis/components/resume-uploader";
import { useResumeAnalysis } from "@/features/resume-analysis/hooks/use-resume-analysis";

export const ResumeUploaderClient = () => {
  const { error, isLoading, result, statusMessage, submitAnalysis } = useResumeAnalysis();

  return (
    <>
      <ResumeUploader
        isLoading={isLoading}
        onSubmit={submitAnalysis}
        statusMessage={statusMessage}
      />
      <AnalysisResult error={error} result={result} />
    </>
  );
};
