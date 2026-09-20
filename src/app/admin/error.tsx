"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AdminError({
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
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
      <p className="font-display font-bold">Something went wrong.</p>
      <p className="max-w-sm text-sm text-ink/50">
        That admin page hit an unexpected error. Try again, or head back to the dashboard.
      </p>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
