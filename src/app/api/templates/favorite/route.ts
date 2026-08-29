import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { z } from "zod";

const favoriteSchema = z.object({ templateId: z.string().uuid() });

/** Toggling, not two separate add/remove routes — the caller doesn't need
 * to track current state itself to know which one to call; this checks and
 * flips it server-side in one round trip, returning the new state so the
 * client can update its own UI from the authoritative result rather than
 * assuming its optimistic guess was right. */
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(favoriteSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { templateId } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from("template_favorites")
    .select("id")
    .eq("user_id", user!.id)
    .eq("template_id", templateId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("template_favorites").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ message: "Couldn't update favorites." }, { status: 500 });
    return NextResponse.json({ favorited: false });
  }

  // A nonexistent templateId fails this insert on the foreign key rather
  // than silently creating a dangling favorite — validated implicitly by
  // the database, not re-checked here.
  const { error } = await supabase.from("template_favorites").insert({ user_id: user!.id, template_id: templateId });
  if (error) {
    const status = error.code === "23503" ? 404 : 500; // FK violation -> template doesn't exist
    return NextResponse.json({ message: status === 404 ? "Template not found." : "Couldn't update favorites." }, { status });
  }
  return NextResponse.json({ favorited: true });
}
