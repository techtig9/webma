import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

// Consolidates the "rounded-full bg-..." pill pattern the Phase 4 audit
// found hand-rolled across 18 files (tags, statuses, plan labels) with no
// shared component, into one place with real semantic variants instead of
// each caller picking its own ad hoc color.
const VARIANTS = {
  neutral: "bg-ink/[0.06] text-ink/60",
  accent: "bg-signal/10 text-signal",
  success: "bg-signal2/10 text-signal2",
  warning: "bg-amber/10 text-amber",
  danger: "bg-red-500/10 text-red-500",
} as const;

export function Badge({
  variant = "neutral",
  className,
  ...props
}: {
  variant?: keyof typeof VARIANTS;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
