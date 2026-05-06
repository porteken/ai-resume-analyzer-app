"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

import type { JSX } from "react";

type ErrorPageProperties = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({
  error,
  reset,
}: Readonly<ErrorPageProperties>): JSX.Element {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-center">
      <div className="absolute inset-0 animate-[gradient-shift_8s_ease_infinite] bg-linear-to-br from-indigo-100 via-white to-cyan-100 bg-size-[200%_200%]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-6 rounded-3xl border border-white/50 bg-white/75 p-8 shadow-2xl backdrop-blur-xl md:p-10">
        <div className="animate-in zoom-in-95 fade-in mx-auto flex size-16 items-center justify-center rounded-3xl bg-linear-to-br from-amber-500 to-rose-500 text-white shadow-lg duration-700">
          <AlertTriangle className="size-8" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Something went wrong
          </h1>
          <p className="text-sm/6 text-slate-600 md:text-base">
            The page failed to load correctly. Please retry or head back home.
          </p>
          {error.digest && (
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Reference: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            className="bg-linear-to-r from-indigo-600 to-cyan-600 text-white hover:from-indigo-700 hover:to-cyan-700"
            onClick={reset}
            type="button"
          >
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/">
              <Home className="size-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
