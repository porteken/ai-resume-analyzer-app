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

const isE2ETestMode = (): boolean => {
  const flag: unknown = import.meta.env.VITE_E2E_TEST;
  return flag === "1" || flag === "true" || flag === true;
};

const resolveSiteKey = (propertyOverride?: string): string | undefined => {
  const environmentValue: unknown = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const environmentSiteKey =
    typeof environmentValue === "string" ? environmentValue : undefined;
  const resolved = propertyOverride ?? environmentSiteKey?.trim() ?? undefined;
  if (!resolved || resolved.trim() === "") {
    return undefined;
  }
  return resolved.trim();
};

const logSiteKeyStatus = (siteKey: string | undefined): void => {
  if (siteKey) {
    console.error("[Turnstile] siteKey present", { length: siteKey.length });
    return;
  }
  console.error(
    "[Turnstile] MISCONFIGURED: VITE_TURNSTILE_SITE_KEY missing at build",
  );
};

export const ResumeUploaderClient = ({
  turnstileSiteKey: turnstileSiteKeyProperty,
  turnstileToken: controlledTurnstileToken,
}: ResumeUploaderClientProperties = {}): JSX.Element => {
  // Public site key only — never hardcode keys here.
  // Required env: `VITE_TURNSTILE_SITE_KEY` (frontend, Cloudflare Pages env var).
  // Server verifies with `TURNSTILE_SECRET_KEY` (Pages secret, see turnstile.ts).
  // E2E skips the real widget (external api.js + manual solve would keep
  // Analyze disabled and break mocked API flows); server is mocked via
  // page.route in e2e.
  const isE2E = isE2ETestMode();
  const resolvedKey = resolveSiteKey(turnstileSiteKeyProperty);
  const normalizedSiteKey = isE2E ? undefined : resolvedKey;

  if (!isE2E) {
    logSiteKeyStatus(normalizedSiteKey);
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
