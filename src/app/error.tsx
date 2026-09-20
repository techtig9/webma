"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

// Covers every route outside /dashboard and /admin (those have their own
// scoped boundaries) — the marketing site and auth pages previously had
// no error.tsx of their own, so any thrown error there skipped straight
// to global-error.tsx's bare, unbranded crash screen instead of a page
// that still looks like webma and offers a way back.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#070a12] px-6 text-center text-white">
      <Link href="/" className="focus-ring rounded-lg">
        <Logo size={26} />
      </Link>
      <div>
        <p className="font-mono text-sm uppercase tracking-wide text-white/40">Error</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Something went wrong.</h1>
        <p className="mt-3 max-w-sm text-sm text-white/50">
          That was unexpected on our end — try again, or head back home.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="secondary">
          Back home
        </Button>
      </div>
    </main>
  );
}
