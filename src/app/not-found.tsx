import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Page not found" };

// Previously fell through to Next's generic, unbranded default 404 —
// the only page in the app with zero webma styling or navigation, a real
// gap for anyone who reaches this from a broken/typo'd or stale shared
// link (a genuinely common path for a public marketing site).
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#070a12] px-6 text-center text-white">
      <Link href="/" className="focus-ring rounded-lg">
        <Logo size={26} />
      </Link>
      <div>
        <p className="font-mono text-sm uppercase tracking-wide text-white/40">404</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">This page doesn&apos;t exist.</h1>
        <p className="mt-3 max-w-sm text-sm text-white/50">
          The link you followed may be broken, or the page may have moved.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button href="/">Back home</Button>
        <Button href="/dashboard" variant="secondary">
          Go to dashboard
        </Button>
      </div>
    </main>
  );
}
