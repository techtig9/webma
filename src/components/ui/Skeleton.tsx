import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

// A shared placeholder for the animate-pulse loading blocks that were
// previously hand-written inline wherever a page needed one (and, per the
// Phase 4 audit, frequently missing entirely). Width/height are controlled
// via className (e.g. "h-4 w-32") since callers' shapes vary too much for
// fixed props to cover.
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("animate-pulse rounded-lg bg-ink/10", className)} {...props} />;
}
