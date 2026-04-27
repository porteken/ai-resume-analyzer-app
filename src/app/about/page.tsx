import { ArrowLeft, ExternalLink, Mail, Server } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description:
    "Learn more about AI Resume Analyzer — a tool that uses Gemini 2.5 Flash AI to evaluate resume-job description fit.",
  title: "About",
};

const projectLinks = [
  {
    href: "https://github.com/porteken/ai-resume-analyzer-app",
    label: "Frontend App on GitHub",
    icon: ExternalLink,
  },
  {
    href: "https://github.com/porteken/ai-resume-analyzer-sam",
    label: "Backend API on GitHub",
    icon: Server,
  },
] as const;

export default function About() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div className="animate-gradient-shift absolute inset-0 bg-gradient-to-br from-indigo-100 via-white to-cyan-100 bg-[length:200%_200%]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="relative z-10 w-full max-w-3xl">
        <div className="animate-in fade-in zoom-in-95 space-y-8 rounded-3xl border border-white/50 bg-white/70 p-8 shadow-2xl backdrop-blur-xl duration-700 md:p-10">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 hover:underline"
            href="/"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="animate-in fade-in slide-in-from-top-4 space-y-3 text-center duration-500">
            <span className="inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              Built for modern job search workflows
            </span>
            <h1 className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
              About AI Resume Analyzer
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              AI Resume Analyzer is a web application that helps job seekers
              evaluate how well their resume matches a specific job description.
              Using Google&apos;s Gemini 2.5 Flash AI model, the app analyzes
              uploaded PDF resumes and provides detailed feedback including
              strengths, gaps, and recommendations.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="animate-in fade-in slide-in-from-left-4 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-lg duration-500">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Project Links
                </h2>
              </div>

              <div className="space-y-3">
                {projectLinks.map(({ href, icon: Icon, label }) => (
                  <a
                    className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/70"
                    href={href}
                    key={href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{label}</p>
                      <p className="text-sm text-slate-500 group-hover:text-indigo-700">
                        Open repository
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            <section className="animate-in fade-in slide-in-from-right-4 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-lg delay-100 duration-500">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Contact
                </h2>
              </div>

              <p className="mb-4 text-sm leading-6 text-slate-600">
                Questions, ideas, or collaboration notes? Reach out directly.
              </p>

              <a
                className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100"
                href="mailto:porteken@gmail.com"
              >
                <Mail className="h-4 w-4" />
                porteken@gmail.com
              </a>
            </section>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/60 p-5 text-center text-sm text-slate-500 shadow-sm">
            Resume reviews are serious business. The UI, however, is now allowed
            to have a little swagger.
          </div>
        </div>
      </div>
    </div>
  );
}
