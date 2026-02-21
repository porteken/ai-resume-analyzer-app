"use client";

import { AlertCircle, CheckCircle, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  pollForResults,
  uploadResume,
  validateFile,
  validateJobDescription,
} from "@/lib/resume-utils";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);

  const handleSubmit = useCallback(async () => {
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
    setStatusMessage("Preparing upload...");

    try {
      setStatusMessage("Reading PDF file...");
      const uploadData = await uploadResume(file, jobDescription.trim());

      if (uploadData.job_id) {
        setStatusMessage("Analyzing...");
        const analysisResult = await pollForResults(
          uploadData.job_id,
          setStatusMessage,
        );
        setResult(analysisResult);
      } else if (uploadData.analysis_result) {
        setResult(uploadData.analysis_result);
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
  }, [file, jobDescription]);

  const renderedResult = useMemo(() => {
    if (!result) {
      return null;
    }

    return result.split("\n\n").map((section, sectionIndex) => {
      const lines = section.split("\n");
      const firstLine = lines[0];

      if (firstLine.startsWith("## ")) {
        const heading = firstLine.replace("## ", "");
        const content = lines.slice(1).join("\n");

        return (
          <div className="space-y-2" key={`${heading}-${sectionIndex}`}>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              {heading.includes("Match Score") && (
                <span className="text-2xl">📊</span>
              )}
              {heading.includes("Strengths") && (
                <span className="text-2xl">✨</span>
              )}
              {heading.includes("Gaps") && <span className="text-2xl">⚠️</span>}
              {heading.includes("Recommendations") && (
                <span className="text-2xl">💡</span>
              )}
              {heading}
            </h3>
            <div className="pl-4">
              {content.split("\n").map((line, lineIndex) => {
                if (line.startsWith("- ")) {
                  const lineContent = line
                    .replace("- ", "")
                    .replaceAll("**", "");
                  return (
                    <div
                      className="flex gap-2 mb-2"
                      key={`bullet-${sectionIndex}-${lineIndex}`}
                    >
                      <span className="text-slate-400 mt-1">•</span>
                      <span className="text-slate-700 text-sm flex-1">
                        {lineContent}
                      </span>
                    </div>
                  );
                }

                if (line.trim()) {
                  const cleanLine = line.replaceAll("**", "");
                  return (
                    <p
                      className="text-slate-700 text-sm mb-2"
                      key={`paragraph-${sectionIndex}-${lineIndex}`}
                    >
                      {cleanLine}
                    </p>
                  );
                }

                return null;
              })}
            </div>
          </div>
        );
      }

      if (section.trim()) {
        return (
          <p className="text-slate-700 text-sm" key={`section-${sectionIndex}`}>
            {section}
          </p>
        );
      }

      return null;
    });
  }, [result]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-lg space-y-6 bg-white p-8 rounded-xl shadow-sm border">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            AI Resume Analyzer
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload resume to match against job description using Gemini 2.5
            Flash.
          </p>
          <Link className="text-sm text-blue-600 hover:underline" href="/about">
            About
          </Link>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="resume">Resume (PDF)</Label>
            <Input
              accept=".pdf"
              disabled={isLoading}
              id="resume"
              onChange={(event) =>
                setFile(event.target.files ? event.target.files[0] : null)
              }
              type="file"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="job-desc">Job Description</Label>
            <Textarea
              className="min-h-[120px]"
              disabled={isLoading}
              id="job-desc"
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description here..."
              value={jobDescription}
            />
          </div>

          <Button
            aria-label="Analyze Resume"
            className="w-full"
            disabled={isLoading || !file || !jobDescription.trim()}
            onClick={handleSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {statusMessage}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Analyze Resume
              </>
            )}
          </Button>

          {isLoading && (
            <p
              aria-atomic
              aria-live="polite"
              className="text-sm text-center text-muted-foreground"
              role="status"
            >
              {statusMessage}
            </p>
          )}
        </div>

        {error && (
          <div
            aria-live="assertive"
            className="rounded-md bg-red-50 p-4 text-sm text-red-600 flex items-start gap-2"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="rounded-md bg-white p-6 mt-4 border shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b text-green-700 font-semibold">
              <CheckCircle className="h-5 w-5" />
              <span>Analysis Complete</span>
            </div>
            <div className="prose prose-sm max-w-none">{renderedResult}</div>
          </div>
        )}
      </div>
    </div>
  );
}
