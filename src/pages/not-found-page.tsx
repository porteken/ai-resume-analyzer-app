import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "react-router";

import type { JSX } from "react";

export function NotFoundPage(): JSX.Element {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-center">
      <div className="absolute inset-0 animate-[gradient-shift_8s_ease_infinite] bg-linear-to-br from-indigo-100 via-white to-cyan-100 bg-size-[200%_200%]" />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-6 rounded-3xl border border-white/50 bg-white/75 p-8 shadow-2xl backdrop-blur-xl md:p-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-600 md:text-base">
          The page you are looking for does not exist.
        </p>
        <div className="flex justify-center">
          <Button asChild type="button">
            <Link to="/">
              <Home className="size-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
