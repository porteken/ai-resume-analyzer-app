"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnalysisResultProperties {
  error: null | string;
  result: null | string;
}

export const AnalysisResult = ({ error, result }: AnalysisResultProperties) => {
  return (
    <>
      {error && (
        <div
          aria-live="assertive"
          className="rounded-xl bg-red-50/80 backdrop-blur-sm p-4 text-sm text-red-600 flex items-start gap-3 border border-red-200/50 animate-in fade-in slide-in-from-bottom-4 duration-500"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="rounded-xl bg-white/80 backdrop-blur-md p-6 mt-4 border border-white/20 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/50 text-emerald-700 font-semibold">
            <CheckCircle className="h-5 w-5" />
            <span>Analysis Complete</span>
          </div>
          <div className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-headings:font-semibold prose-h3:text-lg prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </>
  );
};
