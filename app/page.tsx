"use client";

import { AlertCircle, CheckCircle, Loader2, Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";




const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.addEventListener('load', () => {
      const result = reader.result as string;
      const base64String = result.split(",")[1];
      resolve(base64String);
    });

    reader.addEventListener('error', () => {
      reject(new Error(`File reading failed: ${reader.error?.message || "Unknown error"}`));
    });
  });
};


const validateFile = (file: File | null): null | string => {
  if (!file) return "Please provide both a PDF resume and a Job Description.";

  const maxSizeBytes = 5 * 1024 * 1024; 
  if (file.size > maxSizeBytes) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please use a PDF smaller than 5MB.`;
  }

  return null;
};


const uploadResume = async (file: File, jobDescription: string) => {
  const pdfBase64 = await convertFileToBase64(file);
  console.log("PDF size:", file.size, "bytes", "Base64 length:", pdfBase64.length);

  const payload = {
    filename: file.name,
    job_description: jobDescription,
    pdf_base64: pdfBase64,
  };

  const uploadResponse = await fetch("/api/upload", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Upload failed with status: ${uploadResponse.status}`);
  }

  return uploadResponse.json();
};


const pollForResults = async (
  jobId: string,
  onProgress: (message: string) => void
): Promise<string> => {
  const statusUrl = `/api/status/${jobId}`;
  const maxAttempts = 150;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    await sleep(2000);

    const statusResponse = await fetch(statusUrl);
    if (!statusResponse.ok) throw new Error("Status check failed.");

    const statusData = await statusResponse.json();
    const { status } = statusData;

    if (status === "completed") {
      return statusData.analysis_result;
    }

    if (status === "failed") {
      throw new Error(statusData.error || "Analysis failed on server.");
    }

    onProgress(`Analyzing... (Attempt ${attempts})`);
  }

  throw new Error("Request timed out.");
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);

  const handleSubmit = async () => {
    const validationError = validateFile(file);
    if (validationError || !jobDescription) {
      setError(validationError || "Please provide both a PDF resume and a Job Description.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setStatusMessage("Preparing upload...");

    try {
      setStatusMessage("Reading PDF file...");
      const uploadData = await uploadResume(file!, jobDescription);
      console.log("Upload response:", uploadData);

      if (uploadData.job_id) {
        setStatusMessage("Analyzing...");
        const analysisResult = await pollForResults(uploadData.job_id, setStatusMessage);
        setResult(analysisResult);
      } else if (uploadData.analysis_result) {
        setResult(uploadData.analysis_result);
      } else {
        throw new Error("Unexpected response format from server. No job_id or analysis_result found.");
      }
    } catch (error_: unknown) {
      console.error(error_);
      const errorMessage = error_ instanceof Error ? error_.message : "An unexpected error occurred.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-lg space-y-6 bg-white p-8 rounded-xl shadow-sm border">
        
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">AI Resume Analyzer</h1>
          <p className="text-sm text-muted-foreground">
            Upload resume to match against job description using Gemini 2.5 Flash.
          </p>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="resume">Resume (PDF)</Label>
            <Input
              accept=".pdf"
              disabled={isLoading}
              id="resume"
              onChange={(event) => setFile(event.target.files ? event.target.files[0] : null)}
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
            className="w-full" 
            disabled={isLoading || !file || !jobDescription}
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
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 flex items-start gap-2">
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
            <div className="prose prose-sm max-w-none">
              {result.split('\n\n').map((section) => {
                
                const lines = section.split('\n');
                const firstLine = lines[0];

                
                if (firstLine.startsWith('## ')) {
                  const heading = firstLine.replace('## ', '');
                  const content = lines.slice(1).join('\n');

                  return (
                    <div className="space-y-2" key={heading}>
                      <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                        {heading.includes('Match Score') && <span className="text-2xl">📊</span>}
                        {heading.includes('Strengths') && <span className="text-2xl">✨</span>}
                        {heading.includes('Gaps') && <span className="text-2xl">⚠️</span>}
                        {heading.includes('Recommendations') && <span className="text-2xl">💡</span>}
                        {heading}
                      </h3>
                      <div className="pl-4">
                        {content.split('\n').map((line) => {

                          if (line.startsWith('- ')) {
                            const lineContent = line.replace('- ', '').replaceAll('**', '');
                            return (
                              <div className="flex gap-2 mb-2" key={lineContent}>
                                <span className="text-slate-400 mt-1">•</span>
                                <span className="text-slate-700 text-sm flex-1">{lineContent}</span>
                              </div>
                            );
                          }

                          if (line.trim()) {
                            const cleanLine = line.replaceAll('**', '');
                            return (
                              <p className="text-slate-700 text-sm mb-2" key={cleanLine}>
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
                    <p className="text-slate-700 text-sm" key={section}>
                      {section}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}