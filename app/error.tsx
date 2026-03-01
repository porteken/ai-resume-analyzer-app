"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface ErrorPageProperties {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({
  error,
  reset,
}: Readonly<ErrorPageProperties>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">
        Something went wrong
      </h1>
      <p className="text-sm text-slate-600">
        The page failed to load correctly. Please retry.
      </p>
      <Button onClick={() => reset()} type="button" variant="outline">
        Try again
      </Button>
    </main>
  );
}
