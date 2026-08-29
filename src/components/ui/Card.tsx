import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

// Consolidates the two competing radii the Phase 4 audit found across
// dashboard/marketing surfaces (rounded-xl used 23x, rounded-2xl 19x, for
// conceptually identical "card" surfaces) into one shared default, and the
// scattered padding values (p-3 through p-10 with no evident rule) into a
// named scale. Existing `glass-panel`/`saas-card` usages aren't ripped out
// wholesale — this is additive infrastructure for new and touched call
// sites, not a forced repaint of every existing card in one pass.
const PADDING = {
  sm: "p-4",
  md: "p-6",
  lg: "p-10",
} as const;

export function Card({
  padding = "md",
  interactive = false,
  className,
  ...props
}: {
  padding?: keyof typeof PADDING;
  /** Adds hover lift + border highlight for cards that are themselves a
   * click target (e.g. a project/template card), not for static panels. */
  interactive?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "glass-panel rounded-2xl",
        PADDING[padding],
        interactive && "lift-on-hover cursor-pointer transition-all duration-200 hover:border-signal/30",
        className
      )}
      {...props}
    />
  );
}
