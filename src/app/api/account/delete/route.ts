import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { sendAccountDeletedEmail, notifyAdmin } from "@/lib/email";
import { reportError } from "@/lib/error-report";

export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();

  // Fetched BEFORE deletion — the cascade below removes the public.users row
  // (and the auth user itself), so this is the last point email/name are
  // available to confirm the deletion to the person who requested it.
  const { data: profile } = await supabase.from("users").select("name").eq("id", user!.id).maybeSingle();
  const email = user!.email ?? "";
  const name = profile?.name ?? "";

  // Deleting the auth user cascades to public.users, subscriptions, projects,
  // deployments, and payments via their `on delete cascade` foreign keys.
  const { error } = await supabase.auth.admin.deleteUser(user!.id);

  if (error) {
    return NextResponse.json({ message: "Couldn't delete your account. Try again." }, { status: 500 });
  }

  // actorId is intentionally omitted (not left as the now-deleted user's id) — the
  // FK is `on delete set null`, so this keeps the log row valid; targetId preserves
  // which account it was.
  await writeAuditLog({
    actorId: null,
    actorRole: "user",
    action: "account.deleted",
    targetId: user!.id,
  });

  if (email) {
    sendAccountDeletedEmail(email, name).catch((err) => reportError("account-deleted email failed", err));
  }
  notifyAdmin("account_deleted", { userId: user!.id, email });

  return NextResponse.json({ ok: true });
}
