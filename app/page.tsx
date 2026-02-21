import Link from "next/link";

import { ResumeUploaderClient } from "@/components/resume-uploader-client";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-white to-cyan-100 animate-gradient-shift bg-[length:200%_200%]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white/70 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/50 space-y-6 animate-in fade-in zoom-in-95 duration-700">
          <div className="space-y-2 text-center animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              AI Resume Analyzer
            </h1>
            <p className="text-sm text-slate-500">
              Upload resume to match against job description using Gemini 3.5
              Flash.
            </p>
            <Link
              className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
              href="/about"
            >
              About
            </Link>
          </div>

          <ResumeUploaderClient />
        </div>
      </div>
    </div>
  );
}
