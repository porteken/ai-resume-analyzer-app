import { AnalysisResult } from "@/features/resume-analysis/components/analysis-result";
import { ResumeUploader } from "@/features/resume-analysis/components/resume-uploader";
import { useResumeAnalysis } from "@/features/resume-analysis/hooks/use-resume-analysis";
import { useCallback, useState } from "react";

import type { JSX } from "react";

interface ResumeUploaderClientProperties {
  /**
   * Optional Cloudflare Turnstile public site key. Do NOT hardcode secrets
   * here — inject via `VITE_TURNSTILE_SITE_KEY` (Pages env). When undefined
   * the widget is skipped and the backend fails open (dev mode).
   */
  turnstileSiteKey?: string;
  turnstileToken?: string | null;
}

export const ResumeUploaderClient = ({
  turnstileSiteKey: turnstileSiteKeyProperty,
  turnstileToken: controlledTurnstileToken,
}: ResumeUploaderClientProperties = {}): JSX.Element => {
  // Public site key only — never hardcode keys here.
  // Required env: `VITE_TURNSTILE_SITE_KEY` (frontend, Cloudflare Pages env var).
  // Server verifies with `TURNSTILE_SECRET_KEY` (Pages secret, see turnstile.ts).
  const environmentValue: unknown = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const environmentSiteKey =
    typeof environmentValue === "string" ? environmentValue : undefined;
  const resolvedSiteKey =
    turnstileSiteKeyProperty ?? environmentSiteKey?.trim() ?? undefined;
  const normalizedSiteKey =
    resolvedSiteKey && resolvedSiteKey.trim() !== ""
      ? resolvedSiteKey.trim()
      : undefined;

  if (normalizedSiteKey) {
    console.error("[Turnstile] siteKey present", {
      length: normalizedSiteKey.length,
    });
  } else {
    console.error(
      "[Turnstile] MISCONFIGURED: VITE_TURNSTILE_SITE_KEY missing at build",
    );
  }

  const [internalTurnstileToken, setInternalTurnstileToken] = useState<
    null | string
  >(controlledTurnstileToken ?? null);
  const effectiveTurnstileToken =
    controlledTurnstileToken ?? internalTurnstileToken;
  const [selectedFileError, setSelectedFileError] = useState<null | string>(
    null,
  );
  const {
    cancelAnalysis,
    error,
    isLoading,
    prefetchUpload,
    result,
    statusMessage,
    submitAnalysis,
  } = useResumeAnalysis();

  const handleFileSelectionSuccess = useCallback(() => {
    setSelectedFileError(null);
  }, []);

  const handleTurnstileTokenChange = useCallback((token: null | string) => {
    setInternalTurnstileToken(token);
  }, []);

  const handleFileSelected = useCallback(
    (file: File | null) => {
      prefetchUpload(file, effectiveTurnstileToken ?? undefined);
    },
    [prefetchUpload, effectiveTurnstileToken],
  );

  const handleSubmit = useCallback(
    (file: File | null, jobDescription: string) =>
      submitAnalysis(file, jobDescription, {
        turnstileToken: effectiveTurnstileToken ?? undefined,
      }),
    [submitAnalysis, effectiveTurnstileToken],
  );

  const displayedError = selectedFileError ?? error;
  const displayedResult = selectedFileError ? null : result;

  return (
    <>
      <ResumeUploader
        isLoading={isLoading}
        onCancel={cancelAnalysis}
        onFileSelected={handleFileSelected}
        onFileSelectionError={setSelectedFileError}
        onFileSelectionSuccess={handleFileSelectionSuccess}
        onSubmit={handleSubmit}
        onTurnstileTokenChange={handleTurnstileTokenChange}
        statusMessage={statusMessage}
        turnstileSiteKey={normalizedSiteKey}
        turnstileToken={effectiveTurnstileToken}
      />
      <AnalysisResult error={displayedError} result={displayedResult} />
    </>
  );
};
