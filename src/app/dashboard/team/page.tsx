"use client";

import { useEffect, useState } from "react";
import { UserPlus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

interface Membership {
  role: "owner" | "member";
  accepted_at: string | null;
  organizations: { id: string; name: string; owner_id: string };
}

interface Member {
  id: string;
  role: "owner" | "member";
  accepted_at: string | null;
  invited_email: string | null;
  users: { name: string; email: string } | null;
}

export default function TeamPage() {
  const toast = useToast();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [membersLoadFailed, setMembersLoadFailed] = useState(false);

  async function loadMemberships() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch("/api/orgs/list");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const list: Membership[] = data.memberships ?? [];
      setMemberships(list);
      if (list.length && !activeOrgId) setActiveOrgId(list[0].organizations.id);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMemberships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMembers() {
    if (!activeOrgId) return;
    setMembersLoadFailed(false);
    try {
      const res = await fetch(`/api/orgs/members?organizationId=${activeOrgId}`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {
      setMembersLoadFailed(true);
    }
  }

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  async function createOrg() {
    if (!orgName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/orgs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't create organization.");
        return;
      }
      setOrgName("");
      toast.show("success", "Organization created.");
      await loadMemberships();
      setActiveOrgId(data.org.id);
    } catch {
      toast.show("error", "Network error — organization wasn't created.");
    } finally {
      setCreating(false);
    }
  }

  async function invite() {
    if (!activeOrgId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/orgs/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: activeOrgId, email: inviteEmail.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't send invite.");
        return;
      }
      setInviteEmail("");
      toast.show("success", "Invite sent.");
      const membersRes = await fetch(`/api/orgs/members?organizationId=${activeOrgId}`);
      setMembers((await membersRes.json()).members ?? []);
    } catch {
      toast.show("error", "Network error — invite wasn't sent.");
    } finally {
      setInviting(false);
    }
  }

  async function acceptInvite(organizationId: string) {
    // Showed "Invite accepted" unconditionally, regardless of whether the
    // request actually succeeded — a false success message on failure, not
    // just a missing error state. Now only claims success when the response
    // actually says so.
    try {
      const res = await fetch("/api/orgs/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.show("error", data?.message ?? "Couldn't accept that invite.");
        return;
      }
      toast.show("success", "Invite accepted.");
      loadMemberships();
    } catch {
      toast.show("error", "Network error — invite wasn't accepted.");
    }
  }

  async function removeMember(memberId: string) {
    if (!activeOrgId) return;
    // Was a pure optimistic update with no result check at all — removed the
    // member from local state immediately, then fired the request and never
    // looked at whether it actually succeeded. If it failed (a permission
    // check, a network error), the UI would permanently show them as removed
    // while they were still a real member on the backend — a silent failure
    // with a misleading result, not just a missing loading state. Now
    // reverts the optimistic update and surfaces the real error if the
    // request fails, matching how createOrg/invite already handle this in
    // the same file.
    const previous = members;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    try {
      const res = await fetch("/api/orgs/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: activeOrgId, memberId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMembers(previous);
        toast.show("error", data?.message ?? "Couldn't remove that member.");
      }
    } catch {
      setMembers(previous);
      toast.show("error", "Network error — member wasn't removed.");
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Skeleton className="h-7 w-24" />
        <div className="glass-panel mt-6 rounded-2xl p-6">
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold">Team</h1>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">Couldn't load your organizations — check your connection and try again.</p>
          <button onClick={loadMemberships} className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-sm hover:border-ink">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeOrg = memberships.find((m) => m.organizations.id === activeOrgId);
  const isOwner = activeOrg?.role === "owner";
  const pendingInvites = memberships.filter((m) => !m.accepted_at);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold">Team</h1>
      <p className="mt-1 text-sm text-ink/50">Organizations let your team collaborate on projects together.</p>

      {pendingInvites.map((m) => (
        <div key={m.organizations.id} className="toast-enter mt-4 flex items-center justify-between rounded-xl border border-signal/30 bg-signal/[0.06] px-4 py-3">
          <span className="text-sm">You've been invited to <strong>{m.organizations.name}</strong>.</span>
          <button
            onClick={() => acceptInvite(m.organizations.id)}
            className="focus-ring flex items-center gap-1 rounded-full bg-signal px-3 py-1 text-xs text-paper hover:bg-signal2"
          >
            <Check size={12} /> Accept
          </button>
        </div>
      ))}

      {memberships.length === 0 ? (
        <div className="glass-panel reveal-in mt-6 rounded-2xl p-6">
          <h2 className="h2">Create an organization</h2>
          <p className="mt-1 text-sm text-ink/50">Available on the Business plan.</p>
          <div className="mt-3 flex gap-2">
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Organization name"
              className="focus-ring flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm"
            />
            <Button onClick={createOrg} disabled={creating || !orgName.trim()}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="glass-panel reveal-in mt-6 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="h2">{activeOrg?.organizations.name}</h2>
            {memberships.length > 1 && (
              <select
                value={activeOrgId ?? ""}
                onChange={(e) => setActiveOrgId(e.target.value)}
                className="focus-ring rounded-md border border-ink/15 px-2 py-1 text-xs"
              >
                {memberships.map((m) => (
                  <option key={m.organizations.id} value={m.organizations.id}>
                    {m.organizations.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {isOwner && (
            <div className="mt-4 flex gap-2 border-b border-ink/10 pb-4">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
                className="focus-ring flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm"
              />
              <button
                onClick={invite}
                disabled={inviting || !inviteEmail.trim()}
                className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-4 py-2 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-50"
              >
                <UserPlus size={13} /> Invite
              </button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {membersLoadFailed ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-ink/15 px-3 py-2">
                <p className="text-sm text-ink/50">Couldn't load members.</p>
                <button onClick={loadMembers} className="focus-ring shrink-0 rounded-full border border-ink/15 px-3 py-1 text-xs hover:border-ink">
                  Retry
                </button>
              </div>
            ) : null}
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2">
                <div className="text-sm">
                  <span>{m.users?.name ?? m.invited_email}</span>
                  <span className="ml-2 font-mono text-[11px] text-ink/40">{m.role}</span>
                  {!m.accepted_at && <span className="ml-2 font-mono text-[11px] text-amber">pending</span>}
                </div>
                {isOwner && m.role !== "owner" && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="focus-ring text-ink/40 hover:text-red-500"
                    aria-label="Remove member"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
