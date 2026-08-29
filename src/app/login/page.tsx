"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/ui/AuthShell";

/** Maps the `?error=` code auth/callback/route.ts redirects back with to a
 * message a person can actually act on. Codes are a closed, app-controlled
 * set (never raw provider text) specifically so nothing provider-supplied
 * ever gets echoed to the page unsanitized. Anything unrecognized (a stale
 * link, a future code this page doesn't know about yet) still gets a real
 * message instead of being silently dropped — the bug this replaces. */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Google sign-in was cancelled.",
  provider_error: "Google sign-in isn't available right now. Try again in a moment, or log in with your email and password.",
  exchange_failed: "That sign-in link expired or was already used. Try continuing with Google again.",
  no_code: "That sign-in link wasn't valid. Try continuing with Google again.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Picks up a failure the OAuth callback redirected back with (see
  // auth/callback/route.ts) — this is the fix for the reported "white page"
  // after a failed Google sign-in: this page previously never read this
  // param at all, so a real failure landed the user back here with no
  // indication anything had gone wrong.
  useEffect(() => {
    const code = searchParams.get("error");
    if (code) setError(OAUTH_ERROR_MESSAGES[code] ?? "Sign-in failed. Please try again.");
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Fire-and-forget — never blocks the redirect, and a failure here
    // (a missing RESEND_API_KEY, a transient Resend outage) shouldn't turn
    // into a broken sign-in experience for something this secondary.
    fetch("/api/account/notify-login", { method: "POST" }).catch(() => {});
    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // A successful call navigates the browser away to Google immediately —
    // this only ever runs when the call itself failed before that redirect
    // could happen (provider misconfigured, offline, etc.), which previously
    // had no error handling at all: the button would just silently do
    // nothing, indistinguishable from a hang.
    if (error) {
      setGoogleLoading(false);
      setError(error.message || "Couldn't start Google sign-in. Please try again.");
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to keep building.">
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 py-3 text-sm font-medium hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-ink/40">
        <span className="h-px flex-1 bg-ink/10" /> or <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs font-medium text-ink/60">Password</label>
            <Link href="/forgot-password" className="text-xs text-signal hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/50">
        No account yet?{" "}
        <Link href="/signup" className="text-signal hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  // useSearchParams() requires a Suspense boundary in the App Router (Next
  // bails the whole page to client-only rendering, and fails the production
  // build, without one) — this page has no other dynamic dependency, so the
  // fallback is only ever visible for a fraction of a frame.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
