import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { adminCreateTemplateSchema, validate } from "@/lib/validation";
import type { Json } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(adminCreateTemplateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { structure, tierRequired, isFeatured, ...rest } = parsed.data;

  const supabase = createServiceRoleClient();
  const { data: template, error } = await supabase
    .from("templates")
    .insert({
      ...rest,
      tier_required: tierRequired,
      is_featured: isFeatured,
      structure: structure as unknown as Json,
    })
    .select("id")
    .single();

  if (error || !template) {
    return NextResponse.json({ message: "Couldn't create that template." }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user!.id,
    actorRole: "admin",
    action: "template.created",
    targetId: template.id,
    metadata: { name: rest.name, category: rest.category },
  });

  return NextResponse.json({ ok: true, templateId: template.id });
}
