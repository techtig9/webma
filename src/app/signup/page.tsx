"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/ui/AuthShell";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Set only when signUp() succeeds but returns no session — Supabase's own
  // signal that this project requires email confirmation before a session
  // exists. Previously this case redirected to /dashboard anyway, which
  // just bounced the visitor straight back to /login with no explanation
  // of what actually happened to their signup.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) {
      setAwaitingConfirmation(email);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleResend() {
    if (!awaitingConfirmation) return;
    setResendState("sending");
    const { error } = await supabase.auth.resend({ type: "signup", email: awaitingConfirmation });
    setResendState("sent");
    if (error) setError(error.message);
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    // A successful call navigates the browser away to Google immediately —
    // this only ever runs when the call itself failed before that redirect
    // could happen (provider misconfigured, offline, etc.). Previously
    // unhandled: the button would silently do nothing, indistinguishable
    // from a hang, with no way to know sign-in never actually started.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setGoogleLoading(false);
      setError(error.message || "Couldn't start Google sign-in. Please try again.");
    }
  }

  if (awaitingConfirmation) {
    return (
      <AuthShell title="Check your email" subtitle="One more step before you're in.">
        <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-signal/10 text-signal">
            <Mail size={20} />
          </span>
          <p className="text-sm text-ink/70">
            We sent a confirmation link to <span className="font-medium text-ink">{awaitingConfirmation}</span>.
            Click it to activate your account, then log in.
          </p>
          <Button
            variant="secondary"
            onClick={handleResend}
            disabled={resendState !== "idle"}
            aria-busy={resendState === "sending"}
            className="mt-2 w-full"
          >
            {resendState === "sent" ? "Email resent" : resendState === "sending" ? "Resending…" : "Resend email"}
          </Button>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
        <p className="mt-6 text-center text-sm text-ink/50">
          Wrong email?{" "}
          <button onClick={() => setAwaitingConfirmation(null)} className="text-signal hover:underline">
            Go back
          </button>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Start generating websites in minutes.">
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        aria-busy={googleLoading}
        className="focus-ring flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 py-3 text-sm font-medium hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-ink/40">
        <span className="h-px flex-1 bg-ink/10" /> or <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="mb-1 block text-xs font-medium text-ink/60">Name</label>
          <input
            id="signup-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-describedby={error ? "signup-error" : undefined}
            className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-1 block text-xs font-medium text-ink/60">Email</label>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={error ? "signup-error" : undefined}
            className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="mb-1 block text-xs font-medium text-ink/60">Password</label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={error ? "signup-error" : undefined}
            className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
          />
        </div>
        {error && <p id="signup-error" role="alert" className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink/50">
        Already have an account?{" "}
        <Link href="/login" className="text-signal hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
          }
