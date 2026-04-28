import { ResumeUploaderClient } from "@/features/resume-analysis/components/resume-uploader-client";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div className="animate-gradient-shift absolute inset-0 bg-linear-to-br from-indigo-100 via-white to-cyan-100 bg-size-[200%_200%]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="animate-in fade-in zoom-in-95 space-y-6 rounded-2xl border border-white/50 bg-white/70 p-8 shadow-2xl backdrop-blur-xl duration-700">
          <div className="animate-in fade-in slide-in-from-top-4 space-y-2 text-center duration-500">
            <h1 className="bg-linear-to-r from-indigo-600 to-cyan-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              AI Resume Analyzer
            </h1>
            <p className="text-sm text-slate-500">
              Upload resume to match against job description using Gemini 2.5
              Flash.
            </p>
            <Link
              className="text-sm text-indigo-600 transition-colors hover:text-indigo-700 hover:underline"
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
