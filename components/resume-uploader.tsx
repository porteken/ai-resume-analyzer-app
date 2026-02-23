"use client";

import { Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const toAscii = (text: string): string =>
  text
    .replaceAll(/[\u2018\u2019]/g, "'")
    .replaceAll(/[\u201C\u201D]/g, '"')
    .replaceAll(/[\u2013\u2014]/g, "-")
    .replaceAll("\u2026", "...")
    .replaceAll(/[^\u0020-\u007F]/g, "");

interface ResumeUploaderProperties {
  isLoading: boolean;
  onSubmit: (file: File | null, jobDescription: string) => Promise<void>;
  statusMessage: string;
}

export const ResumeUploader = ({
  isLoading,
  onSubmit,
  statusMessage,
}: ResumeUploaderProperties) => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const buttonLabel = isLoading
    ? statusMessage || "Processing Resume..."
    : "Analyze Resume";

  const handleSubmit = useCallback(() => {
    const cleanedDescription = toAscii(
      jobDescription.trim().replaceAll(/\s+/g, " "),
    );
    setJobDescription(cleanedDescription);
    onSubmit(file, cleanedDescription);
  }, [file, jobDescription, onSubmit]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 animate-in fade-in slide-in-from-left-4 duration-500">
        <Label className="text-slate-700 font-medium" htmlFor="resume">
          Resume (PDF)
        </Label>
        <Input
          accept=".pdf"
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all duration-200 cursor-pointer"
          disabled={isLoading}
          id="resume"
          onChange={(event) =>
            setFile(event.target.files ? event.target.files[0] : null)
          }
          type="file"
        />
      </div>

      <div className="grid gap-2 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
        <Label className="text-slate-700 font-medium" htmlFor="job-desc">
          Job Description
        </Label>
        <Textarea
          className="min-h-[120px] resize-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
          disabled={isLoading}
          id="job-desc"
          onChange={(event) => setJobDescription(event.target.value)}
          placeholder="Paste the job description here..."
          value={jobDescription}
        />
      </div>

      <Button
        aria-label={buttonLabel}
        className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
        disabled={isLoading || !file || !jobDescription.trim()}
        onClick={handleSubmit}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {buttonLabel}
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {buttonLabel}
          </>
        )}
      </Button>
    </div>
  );
};
