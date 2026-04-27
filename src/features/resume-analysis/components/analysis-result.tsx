"use client";

import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Lightbulb,
  TriangleAlert,
} from "lucide-react";
import { lazy, Suspense, useMemo } from "react";

import { cn } from "@/lib/utils";
import { type AnalysisResultData } from "@/types";

interface AnalysisResultProperties {
  error: null | string;
  result: AnalysisResultData | null;
}

type StructuredAnalysisResult = Exclude<AnalysisResultData, string>;

const LazyAnalysisMarkdown = lazy(() => import("./analysis-markdown"));

const structuredSections = [
  {
    accentClassName: "border-sky-200/80 bg-sky-50/80 text-sky-900 delay-75",
    emptyMessage: "No strengths provided.",
    icon: CheckCircle2,
    iconClassName: "bg-sky-100 text-sky-700",
    key: "strengths",
    subtitle: "What already stands out",
    title: "Strengths",
  },
  {
    accentClassName:
      "border-amber-200/80 bg-amber-50/80 text-amber-950 delay-150",
    emptyMessage: "No gaps identified.",
    icon: TriangleAlert,
    iconClassName: "bg-amber-100 text-amber-700",
    key: "gaps",
    subtitle: "Where the resume can get sharper",
    title: "Gaps",
  },
  {
    accentClassName:
      "border-emerald-200/80 bg-emerald-50/80 text-emerald-950 delay-200",
    emptyMessage: "No recommendations provided.",
    icon: Lightbulb,
    iconClassName: "bg-emerald-100 text-emerald-700",
    key: "recommendations",
    subtitle: "High-impact next steps",
    title: "Recommendations",
  },
] as const;

const markdownFallback = (
  <div className="space-y-3">
    <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
    <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
    <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
    <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-200" />
  </div>
);

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const toStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => hasText(item))
    : [];

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

const renderStructuredResult = (result: StructuredAnalysisResult) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {structuredSections.map(
        ({
          accentClassName,
          emptyMessage,
          icon: Icon,
          iconClassName,
          key,
          subtitle,
          title,
        }) => {
          const items = toStringList(result[key]);

          return (
            <section
              className={cn(
                "animate-in fade-in slide-in-from-bottom-4 rounded-2xl border p-5 shadow-sm backdrop-blur-sm duration-700",
                accentClassName,
              )}
              key={key}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-2xl shadow-sm",
                    iconClassName,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
              </div>

              {items.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {items.map((item) => (
                    <li
                      className="flex gap-3 rounded-xl bg-white/70 px-3 py-2 transition-all duration-200 hover:translate-x-1 hover:bg-white"
                      key={item}
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-current/70" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
              )}
            </section>
          );
        },
      )}
    </div>
  );
};

export const AnalysisResult = ({ error, result }: AnalysisResultProperties) => {
  const markdownContent = useMemo(
    () =>
      typeof result === "string"
        ? extractAnalysisSectionsMarkdown(result)
        : null,
    [result],
  );

  const renderedResultContent = (() => {
    if (markdownContent) {
      return (
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
          <Suspense fallback={markdownFallback}>
            <LazyAnalysisMarkdown content={markdownContent} />
          </Suspense>
        </div>
      );
    }

    if (result && typeof result === "object") {
      return renderStructuredResult(result);
    }

    return null;
  })();

  return (
    <>
      {error && (
        <div
          aria-live="assertive"
          className="animate-in fade-in slide-in-from-bottom-4 flex items-start gap-3 rounded-xl border border-red-200/50 bg-red-50/80 p-4 text-sm text-red-600 backdrop-blur-sm duration-500"
          data-testid="analysis-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-6 mt-4 space-y-5 rounded-2xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur-md duration-700">
          <div className="flex items-center gap-2 border-b border-slate-200/50 pb-3 font-semibold text-emerald-700">
            <CheckCircle className="h-5 w-5" />
            <span>Analysis Complete</span>
          </div>
          {renderedResultContent}
        </div>
      )}
    </>
  );
};
