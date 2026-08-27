import { clsx } from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  // Previously a violet-to-signal gradient with a signal-to-signal2 hover
  // shift (purple -> blue, then blue -> teal). Once signal itself became
  // orange, that combination would clash outright — the actual Figma
  // reference (confirmed via the uploaded screenshot) shows solid, vivid
  // orange CTA buttons with no color-mixing at all, not a gradient. Matches
  // that: a clean solid fill, with a lift and a subtle darken on hover for
  // depth rather than a hue shift.
  primary: "bg-signal text-white shadow-lg shadow-signal/25 hover:bg-signal/90 hover:shadow-signal/40 hover:-translate-y-0.5",
  secondary: "border border-white/10 bg-white/[0.04] text-white hover:border-signal/50 hover:bg-white/[0.08] hover:-translate-y-0.5",
  ghost: "bg-transparent text-white/70 hover:text-white hover:bg-white/[0.05]",
};

const base = "press-on-active inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus-ring";

export function Button({ variant = "primary", href, className, children, ...props }: {
  variant?: Variant;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = clsx(base, variants[variant], className);
  if (href) return <Link href={href} className={classes}>{children}</Link>;
  return <button className={classes} {...props}>{children}</button>;
}
