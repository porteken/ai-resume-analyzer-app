"use client";

import { AnalysisResult } from "@/components/analysis-result";
import { ResumeUploader } from "@/components/resume-uploader";
import { useResumeAnalysis } from "@/hooks/use-resume-analysis";

export const ResumeUploaderClient = () => {
  const { error, isLoading, result, statusMessage, submitAnalysis } =
    useResumeAnalysis();

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
