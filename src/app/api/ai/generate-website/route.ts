import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits, type Action } from "@/lib/credits";
import { generateFullWebsite } from "@/lib/gemini";
import { deriveSections } from "@/lib/preview";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateWebsiteSchema, validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = checkRateLimit(`${user!.id}:generate-website`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(generateWebsiteSchema, body);
  if (parsed.error) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { name, description, answers, projectId } = parsed.data;

  // Regenerating an existing project is priced as "regenerate_complete" (750 credits),
  // distinct from a fresh "generate_full_website" (2,500 credits) — per the credit-cost
  // table, these are deliberately different prices, not the same action twice.
  const action: Action = projectId ? "regenerate_complete" : "generate_full_website";

  // Step 1-4 of the shared canUseFeature check (admin bypass, plan lookup, credit/feature check).
  const gate = await canUseFeature(user!.id, action);
  if (!gate.allowed) {
    const status = gate.reason === "insufficient_credits" ? 402 : 403;
    return NextResponse.json({ message: gate.message }, { status });
  }

  const supabase = createServiceRoleClient();

  try {
    const { site, cacheHit } = await generateFullWebsite(description, answers ?? {});
    const sections = deriveSections(site.files);

    // Persist the project + a new version so it shows up in "Projects" and can be
    // exported/deployed/edited later. Regenerating an existing project increments its
    // version number rather than overwriting version 1 every time, so version history
    // (a plan feature) stays meaningful.
    let activeProjectId = projectId ?? null;
    let nextVersion = 1;

    if (!activeProjectId) {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({ user_id: user!.id, name, description, status: "ready", current_version: 1 })
        .select("id")
        .single();
      if (error) throw error;
      activeProjectId = project.id;
    } else {
      const { data: existingProject } = await supabase
        .from("projects")
        .select("current_version")
        .eq("id", activeProjectId)
        .single();
      nextVersion = (existingProject?.current_version ?? 0) + 1;
      await supabase
        .from("projects")
        .update({ status: "ready", current_version: nextVersion, updated_at: new Date().toISOString() })
        .eq("id", activeProjectId);
    }

    await supabase.from("project_versions").insert({
      project_id: activeProjectId,
      version: nextVersion,
      files: site.files,
      prompt_answers: answers ?? {},
    });

    // Credits are only ever deducted after confirmed success, and cache hits cost nothing —
    // both per the spec's Credit Rules.
    await spendCredits(user!.id, action, {
      isAdmin: gate.isAdmin,
      cacheHit,
      projectId: activeProjectId,
    });

    return NextResponse.json({
      projectId: activeProjectId,
      files: site.files,
      sections,
      cacheHit,
    });
  } catch (err) {
    console.error("generate-website error", err, "user:", user!.id);
    // Nothing was ever deducted for a failed request (spendCredits only runs after
    // success above), so there is nothing to refund here — calling refundCredits
    // would incorrectly hand out free credits for a request that was never charged.
    return NextResponse.json(
      { message: "Generation failed. No credits were charged — try again." },
      { status: 500 }
    );
  }
}
