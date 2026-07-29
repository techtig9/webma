import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { deployToNetlify } from "@/lib/deploy";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { projectId } = await request.json();
  const gate = await canUseFeature(user!.id, "deploy_netlify");
  if (!gate.allowed) {
    return NextResponse.json({ message: gate.message }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, user_id, seo_title, seo_description, seo_og_image_url")
    .eq("id", projectId)
    .single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { data: version } = await supabase
    .from("project_versions")
    .select("files")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (!version) {
    return NextResponse.json({ message: "Nothing to deploy yet." }, { status: 404 });
  }

  // Netlify serves this as a static site (not Next.js), so SEO ships via a plain
  // index.html <head> — the same shape export-zip uses for its "zip"/"react"
  // formats — rather than the layout.tsx metadata export used for Vercel.
  const seoTitle = project.seo_title || project.name;
  const seoDescription = project.seo_description || project.description || "";
  const filesToDeploy: Record<string, string> = {
    ...(version.files as Record<string, string>),
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${seoTitle}</title>
    <meta name="description" content="${seoDescription}" />
    ${project.seo_og_image_url ? `<meta property="og:image" content="${project.seo_og_image_url}" />` : ""}
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
  };

  const { data: deployment } = await supabase
    .from("deployments")
    .insert({ project_id: projectId, provider: "netlify", status: "queued" })
    .select("id")
    .single();

  try {
    const { data: connection } = await supabase
      .from("deploy_connections")
      .select("access_token")
      .eq("user_id", user!.id)
      .eq("provider", "netlify")
      .maybeSingle();

    const result = await deployToNetlify(project.name, filesToDeploy, connection?.access_token);
    await supabase
      .from("deployments")
      .update({ deployment_url: result.deploymentUrl, status: result.status, logs: result.logs ?? null })
      .eq("id", deployment!.id);

    if (result.status === "error") {
      return NextResponse.json({ message: result.logs ?? "Deployment failed." }, { status: 500 });
    }

    await spendCredits(user!.id, "deploy_netlify", { isAdmin: gate.isAdmin, projectId });
    await supabase.from("projects").update({ status: "deployed" }).eq("id", projectId);

    return NextResponse.json({ deploymentUrl: result.deploymentUrl, status: result.status });
  } catch (err) {
    console.error("deploy-netlify error", err, "user:", user!.id);
    await supabase.from("deployments").update({ status: "error" }).eq("id", deployment!.id);
    return NextResponse.json(
      { message: "Netlify isn't connected yet — add NETLIFY_API_TOKEN to your environment." },
      { status: 500 }
    );
  }
}
