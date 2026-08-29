"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
