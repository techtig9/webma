import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { adminDeleteTemplateSchema, validate } from "@/lib/validation";

/** projects.template_id references templates(id) with no ON DELETE action
 * (see supabase/schema.sql), so deleting a template any project was ever
 * created from fails on the foreign key — by design, not a bug to work
 * around: it stops a delete from silently orphaning that reference. Caught
 * here and turned into an honest, actionable message rather than a raw 500,
 * pointing the admin at is_active (deactivate) as the safe alternative. */
export async function POST(request: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(adminDeleteTemplateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { templateId } = parsed.data;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("templates").delete().eq("id", templateId);

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        { message: "Can't delete this template — one or more projects were created from it. Deactivate it instead to hide it from new users." },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Couldn't delete that template." }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user!.id,
    actorRole: "admin",
    action: "template.deleted",
    targetId: templateId,
  });

  return NextResponse.json({ ok: true });
}
