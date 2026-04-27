"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MARKDOWN_REMARK_PLUGINS = [remarkGfm];

interface AnalysisMarkdownProperties {
  content: string;
}

export default function AnalysisMarkdown({
  content,
}: Readonly<AnalysisMarkdownProperties>) {
  return (
    <div className="prose prose-sm prose-slate prose-headings:text-slate-800 prose-headings:font-semibold prose-h3:text-lg prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800 max-w-none">
      <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
