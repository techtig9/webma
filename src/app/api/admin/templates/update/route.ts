import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { adminUpdateTemplateSchema, validate } from "@/lib/validation";
import type { Json } from "@/lib/supabase/database.types";

/** Single endpoint for every kind of template edit — metadata, thumbnail,
 * structure, and the is_active/is_featured toggles — rather than a separate
 * route per field. The admin UI's "Deactivate" button and its full edit form
 * both just POST here with whichever fields actually changed; only those
 * columns are touched (see the dynamic `updates` object below), so toggling
 * is_active can never accidentally clobber a concurrent metadata edit. */
export async function POST(request: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(adminUpdateTemplateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { templateId, tierRequired, isFeatured, isActive, structure, ...rest } = parsed.data;

  const updates: Record<string, unknown> = { ...rest };
  if (tierRequired !== undefined) updates.tier_required = tierRequired;
  if (isFeatured !== undefined) updates.is_featured = isFeatured;
  if (isActive !== undefined) updates.is_active = isActive;
  if (structure !== undefined) updates.structure = structure as unknown as Json;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "No fields to update." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("templates").update(updates).eq("id", templateId);
  if (error) {
    return NextResponse.json({ message: "Couldn't update that template." }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user!.id,
    actorRole: "admin",
    action: "template.updated",
    targetId: templateId,
    metadata: { fields: Object.keys(updates) },
  });

  return NextResponse.json({ ok: true });
}
