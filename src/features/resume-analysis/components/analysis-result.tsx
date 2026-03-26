"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { type AnalysisResultData } from "@/types";

interface AnalysisResultProperties {
  error: null | string;
  result: AnalysisResultData | null;
}

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => hasText(item)) : [];

const extractAnalysisSectionsMarkdown = (markdown: string): string => {
  const normalizedMarkdown = markdown.replaceAll("\r\n", "\n");
  const lines = normalizedMarkdown.split("\n");
  const targetHeadings = new Set(["gaps", "recommendations", "strengths"]);
  const capturedSections: Record<string, string> = {};
  let activeHeading: null | string = null;
  let activeLines: string[] = [];

  const flushSection = () => {
    if (!activeHeading || activeLines.length === 0) {
      return;
    }

    capturedSections[activeHeading] = activeLines.join("\n").trim();
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushSection();
      activeLines = [];

      const headingName = line.slice(3).trim().toLowerCase();
      activeHeading = targetHeadings.has(headingName) ? headingName : null;

      if (activeHeading) {
        activeLines.push(line);
      }

      continue;
    }

    if (activeHeading) {
      activeLines.push(line);
    }
  }

  flushSection();

  const sections = ["strengths", "gaps", "recommendations"]
    .filter((heading) => hasText(capturedSections[heading]))
    .map((heading) => capturedSections[heading].trim());

  if (sections.length === 0) {
    return markdown;
  }

  return sections.join("\n\n");
};

const renderStructuredResult = (result: Exclude<AnalysisResultData, string>) => {
  const strengths = toStringList(result.strengths);
  const gaps = toStringList(result.gaps);
  const recommendations = toStringList(result.recommendations);

  return (
    <div className="space-y-4 text-sm text-slate-700">
      <section className="rounded-lg border border-sky-200 bg-sky-50/70 p-4">
        <h3 className="text-base font-semibold text-sky-900">Strengths</h3>
        {strengths.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sky-900/80">
            {strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-sky-900/70">No strengths provided.</p>
        )}
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
        <h3 className="text-base font-semibold text-amber-900">Gaps</h3>
        {gaps.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900/80">
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-amber-900/70">No gaps identified.</p>
        )}
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
        <h3 className="text-base font-semibold text-emerald-900">Recommendations</h3>
        {recommendations.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-emerald-900/80">
            {recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-emerald-900/70">No recommendations provided.</p>
        )}
      </section>
    </div>
  );
};

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
          {typeof result === "string" ? (
            <div className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-headings:font-semibold prose-h3:text-lg prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {extractAnalysisSectionsMarkdown(result)}
              </ReactMarkdown>
            </div>
          ) : (
            renderStructuredResult(result)
          )}
        </div>
      )}
    </>
  );
};
