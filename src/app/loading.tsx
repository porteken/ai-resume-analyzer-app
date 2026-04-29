import type { JSX } from "react";

export default function Loading(): JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div className="animate-gradient-shift absolute inset-0 bg-linear-to-br from-indigo-100 via-white to-cyan-100 bg-size-[200%_200%]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="space-y-6 rounded-2xl border border-white/50 bg-white/70 p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-4 w-28 animate-pulse rounded-full bg-slate-200" />
            <div className="mx-auto h-8 w-64 animate-pulse rounded-full bg-slate-200" />
            <div className="mx-auto h-4 w-52 animate-pulse rounded-full bg-slate-200" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-32 animate-pulse rounded-2xl border border-dashed border-slate-200 bg-white/80" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
              <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            </div>
            <div className="h-12 animate-pulse rounded-full bg-linear-to-r from-indigo-200 via-sky-200 to-cyan-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
