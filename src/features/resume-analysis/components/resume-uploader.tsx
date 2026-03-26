"use client";

import { Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toAscii } from "@/features/resume-analysis/utils/text";

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

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setFile(event.target.files ? event.target.files[0] : null),
    [],
  );

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
    onSubmit(file, cleanedDescription);
  }, [file, jobDescription, onSubmit]);

  return (
    <div className="grid gap-6">
      <div className="animate-in fade-in slide-in-from-left-4 grid gap-2 duration-500">
        <Label className="font-medium text-slate-700" htmlFor="resume">
          Resume (PDF)
        </Label>
        <Input
          accept=".pdf"
          className="cursor-pointer transition-all duration-200 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          disabled={isLoading}
          id="resume"
          onChange={handleFileChange}
          type="file"
        />
      </div>

      <div className="animate-in fade-in slide-in-from-right-4 grid gap-2 delay-100 duration-500">
        <Label className="font-medium text-slate-700" htmlFor="job-desc">
          Job Description
        </Label>
        <Textarea
          className="min-h-[120px] resize-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20"
          disabled={isLoading}
          id="job-desc"
          onChange={handleJobDescChange}
          placeholder="Paste the job description here..."
          value={jobDescription}
        />
      </div>

      <Button
        aria-label={buttonLabel}
        className="w-full transform bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:from-indigo-700 hover:to-cyan-700 hover:shadow-xl active:scale-[0.98]"
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
