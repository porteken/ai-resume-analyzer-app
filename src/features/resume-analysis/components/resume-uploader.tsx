"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_JOB_DESCRIPTION_CHARS } from "@/features/resume-analysis/utils/job-description";
import { toAscii } from "@/features/resume-analysis/utils/text";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Sparkles, Upload, X } from "lucide-react";
import { type RefObject, useCallback, useMemo, useRef, useState } from "react";

type ResumeUploaderProperties = {
  isLoading: boolean;
  onSubmit: (file: File | null, jobDescription: string) => Promise<void>;
  statusMessage: string;
};

const formatFileSize = (fileSizeInBytes: number): string => {
  if (fileSizeInBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSizeInBytes / 1024))} KB`;
  }

  return `${(fileSizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getStatusProgress = (statusMessage: string): number => {
  const normalizedStatusMessage = statusMessage.trim().toLowerCase();

  if (normalizedStatusMessage.includes("upload")) {
    return 45;
  }

  if (normalizedStatusMessage.includes("analy")) {
    return 82;
  }

  return normalizedStatusMessage ? 20 : 12;
};

type ResumeFileFieldProperties = {
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
};

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
}: Readonly<ResumeFileFieldProperties>) => (
  <div className="animate-in fade-in slide-in-from-left-4 grid gap-3 duration-500">
    <div className="flex items-center justify-between gap-3">
      <Label className="font-medium text-slate-700" htmlFor="resume">
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
      className="sr-only"
      disabled={isLoading}
      id="resume"
      onChange={handleFileChange}
      ref={fileInputReference}
      tabIndex={-1}
      type="file"
    />

    <button
      aria-describedby="resume-file-status"
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
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-800">
            {file ? "Resume ready to go" : "Drag your PDF here"}
          </p>
          <p className="text-sm leading-6 text-slate-500">
            {file
              ? "Drop another PDF to replace it, or choose a different file from your device."
              : "Drop a PDF into the zone or browse manually for a polished AI analysis."}
          </p>
        </div>

        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
          Choose file
        </span>
      </div>
    </button>

    {file && (
      <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-left">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
            <FileText className="h-5 w-5" />
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
          <X className="h-4 w-4" />
          Remove
        </Button>
      </div>
    )}
  </div>
);

type ResumeUploadProgressProperties = {
  progressBarStyle: { width: string };
  progressValue: number;
  statusMessage: string;
};

const ResumeUploadProgress = ({
  progressBarStyle,
  progressValue,
  statusMessage,
}: Readonly<ResumeUploadProgressProperties>) => (
  <div className="animate-in fade-in zoom-in-95 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm duration-500">
    <div className="mb-3 flex items-center justify-between gap-3 text-sm text-indigo-700">
      <div className="flex items-center gap-2 font-medium">
        <Sparkles className="h-4 w-4" />
        <span>{statusMessage || "Processing Resume..."}</span>
      </div>
      <span>{progressValue}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
      <div
        className="h-full rounded-full bg-linear-to-r from-indigo-600 via-sky-500 to-cyan-500 transition-all duration-500 ease-out"
        style={progressBarStyle}
      />
    </div>
  </div>
);

type ResumeSubmitButtonContentProperties = {
  buttonLabel: string;
  isLoading: boolean;
};

const ResumeSubmitButtonContent = ({
  buttonLabel,
  isLoading,
}: Readonly<ResumeSubmitButtonContentProperties>) =>
  isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {buttonLabel}
    </>
  ) : (
    <>
      <Upload className="mr-2 h-4 w-4" />
      {buttonLabel}
    </>
  );

export const ResumeUploader = ({
  isLoading,
  onSubmit,
  statusMessage,
}: ResumeUploaderProperties) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const fileInputReference = useRef<HTMLElementTagNameMap["input"] | null>(
    null,
  );
  const buttonLabel = isLoading
    ? statusMessage || "Processing Resume..."
    : "Analyze Resume";
  const descriptionLength = jobDescription.length;
  const progressValue = useMemo(
    () => getStatusProgress(statusMessage),
    [statusMessage],
  );
  const progressBarStyle = useMemo(
    () => ({ width: `${progressValue}%` }),
    [progressValue],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFile(event.target.files ? event.target.files[0] : null);
      setIsDragging(false);
    },
    [],
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

      setFile(event.dataTransfer.files?.[0] ?? null);
      setIsDragging(false);
    },
    [],
  );

  const clearSelectedFile = useCallback(() => {
    setFile(null);

    if (fileInputReference.current) {
      fileInputReference.current.value = "";
    }
  }, []);

  const handleJobDescChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      setJobDescription(event.target.value),
    [],
  );

  const handleSubmit = useCallback(() => {
    const cleanedDescription = toAscii(
      jobDescription.trim().replaceAll(/\s+/g, " "),
    );
    setJobDescription(cleanedDescription);
    void onSubmit(file, cleanedDescription);
  }, [file, jobDescription, onSubmit]);

  return (
    <div className="grid gap-6">
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

      <div className="animate-in fade-in slide-in-from-right-4 grid gap-2 delay-100 duration-500">
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

      {isLoading && (
        <ResumeUploadProgress
          progressBarStyle={progressBarStyle}
          progressValue={progressValue}
          statusMessage={statusMessage}
        />
      )}

      <Button
        aria-label={buttonLabel}
        className="w-full transform bg-linear-to-r from-indigo-600 to-cyan-600 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-indigo-700 hover:to-cyan-700 hover:shadow-xl active:scale-[0.98]"
        disabled={isLoading || !file || !jobDescription.trim()}
        onClick={handleSubmit}
      >
        <ResumeSubmitButtonContent
          buttonLabel={buttonLabel}
          isLoading={isLoading}
        />
      </Button>
    </div>
  );
};
