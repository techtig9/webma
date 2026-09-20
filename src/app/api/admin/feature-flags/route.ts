import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("feature_flags").select("*").order("key");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ flags: data });
}

const upsertSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only."),
  enabled: z.boolean(),
  description: z.string().trim().max(500).optional().default(""),
});

export async function POST(request: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(upsertSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { key, enabled, description } = parsed.data;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("feature_flags").upsert({
    key,
    enabled,
    description,
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: user!.id,
    actorRole: "admin",
    action: "feature_flag.set",
    targetId: key,
    metadata: { enabled, description },
  });

  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ key: z.string().trim().min(1).max(80) });

export async function DELETE(request: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(deleteSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("feature_flags").delete().eq("key", parsed.data.key);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: user!.id,
    actorRole: "admin",
    action: "feature_flag.deleted",
    targetId: parsed.data.key,
  });

  return NextResponse.json({ ok: true });
}
