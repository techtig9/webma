import { clsx } from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-signal text-paper shadow-lg shadow-signal/20 hover:bg-signal2 hover:shadow-signal2/20 hover:scale-[1.03]",
  secondary: "glass-panel text-ink border-ink/15 hover:border-ink/30 hover:bg-ink/[0.04] hover:scale-[1.02]",
  ghost: "bg-transparent text-ink/80 hover:text-signal",
};

const base =
  "press-on-active inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-200 focus-ring";

export function Button({
  variant = "primary",
  href,
  className,
  children,
  ...props
}: {
  variant?: Variant;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = clsx(base, variants[variant], className);
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
