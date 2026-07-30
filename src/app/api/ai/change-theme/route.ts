import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits, refundCredits } from "@/lib/credits";
import { changeTheme } from "@/lib/gemini";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const changeThemeSchema = z.object({
  projectId: z.string().uuid(),
  instruction: z.string().trim().min(3, "Describe the restyle in a few more words.").max(300),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = checkRateLimit(`${user!.id}:change-theme`, 15, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(changeThemeSchema, body);
  if (parsed.error) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, instruction } = parsed.data;

  const gate = await canUseFeature(user!.id, "change_theme");
  if (!gate.allowed) {
    const status = gate.reason === "insufficient_credits" ? 402 : 403;
    return NextResponse.json({ message: gate.message }, { status });
  }

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase
    .from("projects")
    .select("user_id, current_version")
    .eq("id", projectId)
    .single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { data: version } = await supabase
    .from("project_versions")
    .select("files")
    .eq("project_id", projectId)
    .eq("version", project.current_version)
    .single();
  if (!version) {
    return NextResponse.json({ message: "Nothing to restyle yet." }, { status: 404 });
  }

  try {
    const { files, cacheHit } = await changeTheme(version.files as Record<string, string>, instruction);

    // Applies in place on the current version — like AI edit and autosave, this
    // doesn't mint a new version-history entry; only Generate/Regenerate do.
    const { error } = await supabase
      .from("project_versions")
      .update({ files })
      .eq("project_id", projectId)
      .eq("version", project.current_version);
    if (error) throw error;

    await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
    await spendCredits(user!.id, "change_theme", { isAdmin: gate.isAdmin, cacheHit, projectId });

    return NextResponse.json({ files, cacheHit });
  } catch (err) {
    console.error("change-theme error", err, "user:", user!.id);
    if (!gate.isAdmin) await refundCredits(user!.id, "change_theme", projectId);
    return NextResponse.json({ message: "Restyle failed. No credits were charged — try again." }, { status: 500 });
  }
}
