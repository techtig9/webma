"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProfilePage() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadFailed(true);
        return;
      }
      setEmail(user.email ?? "");

      const [{ data: profile, error: profileError }, { data: sub, error: subError }] = await Promise.all([
        supabase.from("users").select("name").eq("id", user.id).single(),
        supabase.from("subscriptions").select("plan").eq("user_id", user.id).single(),
      ]);
      if (profileError || subError) {
        setLoadFailed(true);
        return;
      }
      setName(profile?.name ?? "");
      setPlan(sub?.plan ?? "free");
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  async function saveName() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setNotice("Your session expired — please log in again.");
      return;
    }
    const { error } = await supabase.from("users").update({ name }).eq("id", user.id);
    setSaving(false);
    setNotice(error ? error.message : "Profile updated.");
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      setNotice("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    setNotice(error ? error.message : "Password updated.");
    setNewPassword("");
    if (!error) {
      // Fire-and-forget — a security-notification email, never allowed to
      // block or fail the password change itself (which already succeeded).
      fetch("/api/account/notify-password-changed", { method: "POST" }).catch(() => {});
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold">Profile</h1>
      {notice && <p className="mt-3 text-sm text-signal" role="status">{notice}</p>}

      {loading ? (
        <div className="glass-panel mt-6 space-y-6 rounded-2xl p-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : loadFailed ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">Couldn't load your profile — check your connection and try again.</p>
          <button onClick={load} className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-ink">
            Retry
          </button>
        </div>
      ) : (
      <div className="glass-panel reveal-in mt-6 space-y-6 rounded-2xl p-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Name</label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="focus-ring flex-1 rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
            />
            <Button variant="secondary" onClick={saveName} disabled={saving}>
              Save
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Email</label>
          <input
            value={email}
            disabled
            className="w-full rounded-lg border border-ink/10 bg-ink/[0.03] px-4 py-2.5 text-sm text-ink/50"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">New password</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="focus-ring flex-1 rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
            />
            <Button variant="secondary" onClick={changePassword} disabled={saving}>
              Update
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Plan</label>
          <p className="rounded-lg border border-ink/10 bg-ink/[0.03] px-4 py-2.5 text-sm capitalize">{plan}</p>
        </div>
      </div>
      )}
    </div>
  );
}
