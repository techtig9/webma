import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { feedbackSchema, validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";
import { notifyAdmin } from "@/lib/email";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  // Generous limit — this isn't a paid/costly action, just guards against spam.
  const limit = await checkRateLimit(`${user!.id}:feedback-submit`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(feedbackSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { type, message } = parsed.data;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("feedback")
    .insert({ user_id: user!.id, type, message })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: "Couldn't submit that — try again." }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user!.id,
    actorRole: "user",
    action: "feedback.submitted",
    targetId: data.id,
    metadata: { type },
  });

  // "bug" reports are the closest thing this app has to a support request
  // worth an immediate nudge — "feature"/"other" feedback still shows up in
  // the admin feedback list, just without also paging the owner's inbox for
  // every single one, per the "sensible notification policy" this feature
  // is meant to have (bug reports are the rarer, more urgent category).
  if (type === "bug") {
    notifyAdmin("feedback_submitted", { type, userId: user!.id, message: message.slice(0, 200) });
  }

  return NextResponse.json({ ok: true });
}
