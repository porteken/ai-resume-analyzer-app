import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateFile } from "@/features/resume-analysis/utils/file-validation";
import { MAX_JOB_DESCRIPTION_CHARS } from "@/features/resume-analysis/utils/job-description";
import { toAscii } from "@/features/resume-analysis/utils/text";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import React, {
  type JSX,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface ResumeUploaderProperties {
  isLoading: boolean;
  onCancel: () => void;
  onFileSelected: (file: File | null) => void;
  onFileSelectionError: (message: string) => void;
  onFileSelectionSuccess: () => void;
  onSubmit: (
    file: File | null,
    jobDescription: string,
    options?: { turnstileToken?: string },
  ) => Promise<void>;
  statusMessage: string;
  /**
   * Optional Cloudflare Turnstile site key (public key only — never put the
   * secret key here). Falls back to `VITE_TURNSTILE_SITE_KEY` in
   * `resume-uploader-client.tsx`. Leave undefined to disable the widget
   * (backend fails open without TURNSTILE_SECRET_KEY, e.g. local dev).
   *
   * Required env:
   * - Frontend (public): `VITE_TURNSTILE_SITE_KEY`
   * - Server (secret, Cloudflare Pages secret / process env):
   *   `TURNSTILE_SECRET_KEY` (already consumed by `src/lib/server/turnstile.ts`).
   */
  turnstileSiteKey?: string;
  turnstileToken?: string | null;
  /**
   * Called when the Turnstile widget verifies/expires/errors so a parent
   * (e.g. `ResumeUploaderClient`) can mirror the token into its own state.
   * When omitted, `ResumeUploader` still captures the token internally and
   * passes it to `onSubmit` as `{ turnstileToken }`.
   */
  onTurnstileTokenChange?: (token: null | string) => void;
}

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileRenderOptions {
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  sitekey: string;
}

interface TurnstileInstance {
  remove: (widgetId?: string) => void;
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    onTurnstileError?: () => void;
    onTurnstileExpired?: () => void;
    onTurnstileVerify?: (token: string) => void;
    turnstile?: TurnstileInstance;
  }
}

let turnstileScriptLoadPromise: null | Promise<void> = null;

const loadTurnstileScriptOnce = (): Promise<void> => {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("Document unavailable"));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptLoadPromise) {
    return turnstileScriptLoadPromise;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
  );
  if (existingScript) {
    turnstileScriptLoadPromise = new Promise<void>((resolve, reject) => {
      existingScript.addEventListener("load", () => {
        resolve();
      });
      existingScript.addEventListener(
        "error",
        () => {
          turnstileScriptLoadPromise = null;
          reject(new Error("Turnstile script failed to load"));
        },
        { once: true },
      );
    });
    return turnstileScriptLoadPromise;
  }

  turnstileScriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      resolve();
    });
    script.addEventListener(
      "error",
      () => {
        turnstileScriptLoadPromise = null;
        reject(new Error("Turnstile script failed to load"));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return turnstileScriptLoadPromise;
};

interface TurnstileWidgetProperties {
  onError?: () => void;
  onExpire?: () => void;
  onVerify: (token: string) => void;
  siteKey: string;
}

/**
 * Managed Turnstile widget (explicit render).
 * Loads `api.js` once, renders via `window.turnstile.render`, and forwards
 * verify/expired/error callbacks. `data-*` attributes are kept so the
 * implicit fallback + tests can still locate the widget.
 */
const TurnstileWidget = ({
  onError,
  onExpire,
  onVerify,
  siteKey,
}: TurnstileWidgetProperties): JSX.Element => {
  const containerReference = useRef<HTMLDivElement | null>(null);
  const widgetIdReference = useRef<null | string>(null);
  const callbacksReference = useRef({ onError, onExpire, onVerify });
  callbacksReference.current = { onError, onExpire, onVerify };

  useEffect(() => {
    let cancelled = false;

    window.onTurnstileVerify = (token: string) => {
      callbacksReference.current.onVerify(token);
    };
    window.onTurnstileExpired = () => {
      callbacksReference.current.onExpire?.();
    };
    window.onTurnstileError = () => {
      callbacksReference.current.onError?.();
    };

    const renderWidget = (): void => {
      if (cancelled || !containerReference.current || !window.turnstile) {
        return;
      }

      if (widgetIdReference.current) {
        try {
          window.turnstile.remove(widgetIdReference.current);
        } catch {
          // Ignore cleanup errors (e.g. widget already removed in tests).
        }
        widgetIdReference.current = null;
      }
      containerReference.current.innerHTML = "";

      try {
        widgetIdReference.current = window.turnstile.render(
          containerReference.current,
          {
            callback: (token: string) => {
              callbacksReference.current.onVerify(token);
            },
            "error-callback": () => {
              callbacksReference.current.onError?.();
            },
            "expired-callback": () => {
              callbacksReference.current.onExpire?.();
            },
            sitekey: siteKey,
          },
        );
      } catch (error) {
        console.error("[Turnstile] render failed", error);
        callbacksReference.current.onError?.();
      }
    };

    loadTurnstileScriptOnce()
      .then(renderWidget)
      .catch((error: unknown) => {
        console.error("[Turnstile] script load failed", error);
        if (!cancelled) {
          callbacksReference.current.onError?.();
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdReference.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdReference.current);
        } catch {
          // Ignore cleanup errors.
        }
        widgetIdReference.current = null;
      }
    };
  }, [siteKey]);

  return (
    <div
      data-callback="onTurnstileVerify"
      data-error-callback="onTurnstileError"
      data-expired-callback="onTurnstileExpired"
      data-sitekey={siteKey}
      ref={containerReference}
    />
  );
};

const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * KB_PER_MB;

const formatFileSize = (fileSizeInBytes: number): string => {
  if (fileSizeInBytes < BYTES_PER_MB) {
    return `${Math.max(1, Math.round(fileSizeInBytes / BYTES_PER_KB))} KB`;
  }

  return `${(fileSizeInBytes / BYTES_PER_MB).toFixed(1)} MB`;
};

const getProcessingStep = (
  statusMessage: string,
): "analyzing" | "idle" | "uploading" => {
  const normalizedStatusMessage = statusMessage.trim().toLowerCase();

  if (normalizedStatusMessage.includes("upload")) {
    return "uploading";
  }

  if (normalizedStatusMessage.includes("analy")) {
    return "analyzing";
  }

  return "idle";
};

const SECONDS_PER_MINUTE = 60;
const ELAPSED_TICK_MS = 1000;

const formatElapsedTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const useElapsedSeconds = (): number => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, ELAPSED_TICK_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return elapsedSeconds;
};

interface ResumeFileFieldProperties {
  clearSelectedFile: () => void;
  file: File | null;
  fileInputReference: RefObject<HTMLInputElement | null>;
  handleBrowseClick: () => void;
  handleDragEnter: (event: React.DragEvent<HTMLButtonElement>) => void;
  handleDragLeave: (event: React.DragEvent<HTMLButtonElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLButtonElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLButtonElement>) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDragging: boolean;
  isLoading: boolean;
}

const ResumeFileField = ({
  clearSelectedFile,
  file,
  fileInputReference,
  handleBrowseClick,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleFileChange,
  isDragging,
  isLoading,
}: Readonly<ResumeFileFieldProperties>): JSX.Element => (
  <div className="grid animate-in gap-3 duration-500 fade-in slide-in-from-left-4">
    <div className="flex items-center justify-between gap-3">
      <Label
        className="font-medium text-slate-700"
        htmlFor="resume"
        id="resume-label"
      >
        Resume (PDF)
      </Label>
      {file && (
        <span
          className="text-xs font-semibold text-indigo-600"
          id="resume-file-status"
        >
          Ready to analyze
        </span>
      )}
    </div>

    <input
      accept=".pdf,application/pdf"
      aria-labelledby="resume-label"
      className="sr-only"
      disabled={isLoading}
      id="resume"
      onChange={handleFileChange}
      ref={fileInputReference}
      tabIndex={-1}
      type="file"
    />

    <button
      aria-describedby={file ? "resume-file-status" : undefined}
      aria-labelledby="resume-upload-action"
      className={cn(
        "rounded-2xl border-2 border-dashed p-1 transition-all duration-300",
        isDragging
          ? "border-indigo-400 bg-indigo-50/80 shadow-lg shadow-indigo-100"
          : "border-slate-200 bg-white/70 hover:border-indigo-300 hover:bg-indigo-50/60",
        isLoading && "cursor-not-allowed opacity-70",
      )}
      disabled={isLoading}
      onClick={handleBrowseClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      type="button"
    >
      <div className="flex flex-col items-center gap-4 rounded-[calc(var(--radius-xl)+0.25rem)] bg-white/60 px-6 py-8 text-center backdrop-blur-sm">
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-500 text-white shadow-lg transition-transform duration-300",
            isDragging && "scale-105",
          )}
        >
          {isLoading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <Upload className="size-6" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-800">
            {file ? "Resume ready to go" : "Drag your PDF here"}
          </p>
          <p className="text-sm/6 text-slate-500">
            {file
              ? "Drop another PDF to replace it, or choose a different file from your device."
              : "Drop a PDF into the zone or browse manually for a polished AI analysis."}
          </p>
        </div>

        <span
          className="inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm"
          id="resume-upload-action"
        >
          Choose file
        </span>
      </div>
    </button>

    {file && (
      <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-left">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">
              {formatFileSize(file.size)} • PDF document
            </p>
          </div>
        </div>

        <Button
          aria-label="Remove selected resume"
          className="self-start text-slate-600 hover:text-slate-900 sm:self-auto"
          disabled={isLoading}
          onClick={clearSelectedFile}
          type="button"
          variant="ghost"
        >
          <X className="size-4" />
          Remove
        </Button>
      </div>
    )}
  </div>
);

interface ResumeUploadProgressProperties {
  statusMessage: string;
}

const ResumeUploadProgress = ({
  statusMessage,
}: Readonly<ResumeUploadProgressProperties>): JSX.Element => {
  const processingStep = getProcessingStep(statusMessage);
  const elapsedSeconds = useElapsedSeconds();

  const getStepIcon = (step: "analyzing" | "uploading"): JSX.Element => {
    if (processingStep === step) {
      return <Loader2 className="size-4 animate-spin" />;
    }

    if (processingStep === "analyzing" && step === "uploading") {
      return <CheckCircle2 className="size-4" />;
    }

    return <Sparkles className="size-4" />;
  };

  const getStepClassName = (step: "analyzing" | "uploading") => {
    if (processingStep === step) {
      return "border-indigo-200 bg-white text-indigo-700 shadow-sm";
    }

    if (processingStep === "analyzing" && step === "uploading") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    return "border-slate-200 bg-slate-50/80 text-slate-500";
  };

  return (
    <div className="animate-in rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm duration-500 zoom-in-95 fade-in">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm font-medium text-indigo-700">
        <span className="flex items-center gap-2">
          <Sparkles className="size-4" />
          <span>{statusMessage || "Processing Resume..."}</span>
        </span>
        <span
          aria-label={`Elapsed time: ${elapsedSeconds} seconds`}
          className="text-indigo-400 tabular-nums"
        >
          {formatElapsedTime(elapsedSeconds)}
        </span>
      </div>

      <div className="grid gap-3">
        {(
          [
            { key: "uploading", label: "Uploading resume" },
            { key: "analyzing", label: "Analyzing resume" },
          ] as const
        ).map(({ key, label }) => (
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors duration-200",
              getStepClassName(key),
            )}
            key={key}
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-current/10">
              {getStepIcon(key)}
            </div>
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ResumeUploader = ({
  isLoading,
  onCancel,
  onFileSelected,
  onFileSelectionError,
  onFileSelectionSuccess,
  onSubmit,
  statusMessage,
  turnstileSiteKey,
  turnstileToken,
  onTurnstileTokenChange,
}: ResumeUploaderProperties): JSX.Element => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [internalTurnstileToken, setInternalTurnstileToken] = useState<
    null | string
  >(null);
  const fileInputReference = useRef<HTMLElementTagNameMap["input"] | null>(
    null,
  );
  const descriptionLength = jobDescription.length;

  const effectiveTurnstileToken = turnstileToken ?? internalTurnstileToken;

  const handleTurnstileVerify = useCallback(
    (token: string) => {
      console.error("[Turnstile] verify token received", {
        length: token.length,
      });
      setInternalTurnstileToken(token);
      onTurnstileTokenChange?.(token);
    },
    [onTurnstileTokenChange],
  );

  const handleTurnstileExpire = useCallback(() => {
    console.error("[Turnstile] token expired, reset required");
    setInternalTurnstileToken(null);
    onTurnstileTokenChange?.(null);
    try {
      window.turnstile?.reset();
    } catch {
      // Ignore reset errors (widget may not be rendered yet).
    }
  }, [onTurnstileTokenChange]);

  const handleTurnstileError = useCallback(() => {
    console.error("[Turnstile] widget error or script load/render failure");
    setInternalTurnstileToken(null);
    onTurnstileTokenChange?.(null);
  }, [onTurnstileTokenChange]);

  const clearFileInput = useCallback(() => {
    if (fileInputReference.current) {
      fileInputReference.current.value = "";
    }
  }, []);

  const handleSelectedFile = useCallback(
    (nextFile: File | null) => {
      if (!nextFile) {
        setFile(null);
        onFileSelectionSuccess();
        onFileSelected(null);
        return;
      }

      const validationError = validateFile(nextFile);

      if (validationError) {
        setFile(null);
        clearFileInput();
        onFileSelectionError(validationError);
        onFileSelected(null);
        return;
      }

      setFile(nextFile);
      onFileSelectionSuccess();
      onFileSelected(nextFile);
    },
    [
      clearFileInput,
      onFileSelected,
      onFileSelectionError,
      onFileSelectionSuccess,
    ],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleSelectedFile(event.target.files?.[0] ?? null);
      setIsDragging(false);
    },
    [handleSelectedFile],
  );

  const handleBrowseClick = useCallback(() => {
    fileInputReference.current?.click();
  }, []);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setIsDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();

      const nextTarget = event.relatedTarget;
      if (
        nextTarget instanceof Node &&
        event.currentTarget.contains(nextTarget)
      ) {
        return;
      }

      setIsDragging(false);
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();

      handleSelectedFile(event.dataTransfer.files[0] ?? null);
      setIsDragging(false);
    },
    [handleSelectedFile],
  );

  const clearSelectedFile = useCallback(() => {
    setFile(null);
    clearFileInput();
    onFileSelectionSuccess();
    onFileSelected(null);
  }, [clearFileInput, onFileSelected, onFileSelectionSuccess]);

  const handleJobDescChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setJobDescription(event.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const cleanedDescription = toAscii(
      jobDescription.trim().replaceAll(/\s+/gu, " "),
    );
    setJobDescription(cleanedDescription);
    void onSubmit(file, cleanedDescription, {
      turnstileToken: effectiveTurnstileToken ?? undefined,
    });
    // Turnstile tokens are single-use: clear + reset so the next submit
    // requires a fresh solve instead of replaying a consumed token
    // (which siteverify rejects with timeout-or-duplicate).
    setInternalTurnstileToken(null);
    onTurnstileTokenChange?.(null);
    try {
      window.turnstile?.reset();
    } catch {
      // Ignore reset errors (widget may not be rendered yet).
    }
  }, [
    file,
    jobDescription,
    onSubmit,
    effectiveTurnstileToken,
    onTurnstileTokenChange,
  ]);

  return (
    <div className="grid gap-6">
      <output aria-live="polite" className="sr-only block">
        {isLoading ? statusMessage || "Processing resume" : ""}
      </output>

      <ResumeFileField
        clearSelectedFile={clearSelectedFile}
        file={file}
        fileInputReference={fileInputReference}
        handleBrowseClick={handleBrowseClick}
        handleDragEnter={handleDragEnter}
        handleDragLeave={handleDragLeave}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        handleFileChange={handleFileChange}
        isDragging={isDragging}
        isLoading={isLoading}
      />

      <div className="grid animate-in gap-2 delay-100 duration-500 fade-in slide-in-from-right-4">
        <div className="flex items-center justify-between gap-3">
          <Label className="font-medium text-slate-700" htmlFor="job-desc">
            Job Description
          </Label>
          <span
            className={cn(
              "text-xs font-medium",
              descriptionLength > MAX_JOB_DESCRIPTION_CHARS
                ? "text-red-600"
                : "text-slate-500",
            )}
            id="job-desc-count"
          >
            {descriptionLength.toLocaleString()} /{" "}
            {MAX_JOB_DESCRIPTION_CHARS.toLocaleString()}
          </span>
        </div>
        <Textarea
          aria-describedby="job-desc-count"
          className="min-h-30 resize-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20"
          disabled={isLoading}
          id="job-desc"
          onChange={handleJobDescChange}
          placeholder="Paste the job description here..."
          value={jobDescription}
        />
      </div>

      {isLoading && <ResumeUploadProgress statusMessage={statusMessage} />}

      {/* Cloudflare Turnstile Managed widget (explicit render).
          Site key comes from `VITE_TURNSTILE_SITE_KEY` via
          `ResumeUploaderClient` (public site key only — never the secret).
          `api.js` is loaded once by `TurnstileWidget`; the token is captured
          via callback -> internal state / `onTurnstileTokenChange` and passed
          as `turnstileToken` so resume-api.ts includes it in /api/upload and
          /api/analyze bodies. Backend verifies with TURNSTILE_SECRET_KEY. */}
      {turnstileSiteKey ? (
        <>
          <TurnstileWidget
            onError={handleTurnstileError}
            onExpire={handleTurnstileExpire}
            onVerify={handleTurnstileVerify}
            siteKey={turnstileSiteKey}
          />
          <input
            name="cf-turnstile-response"
            type="hidden"
            value={effectiveTurnstileToken ?? ""}
          />
        </>
      ) : (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          role="alert"
        >
          Turnstile misconfigured: missing site key (VITE_TURNSTILE_SITE_KEY).
        </div>
      )}

      {isLoading ? (
        <Button
          aria-label="Cancel Analysis"
          className="w-full border border-red-200 bg-white text-red-700 shadow-sm transition-all duration-300 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          <X className="mr-2 size-4" />
          Cancel Analysis
        </Button>
      ) : (
        <Button
          aria-label="Analyze Resume"
          className="w-full transform bg-linear-to-r from-indigo-600 to-cyan-600 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-indigo-700 hover:to-cyan-700 hover:shadow-xl active:scale-[0.98]"
          disabled={
            !file ||
            !jobDescription.trim() ||
            descriptionLength > MAX_JOB_DESCRIPTION_CHARS ||
            Boolean(turnstileSiteKey && !effectiveTurnstileToken)
          }
          onClick={handleSubmit}
        >
          <Upload className="mr-2 size-4" />
          Analyze Resume
        </Button>
      )}
    </div>
  );
};
