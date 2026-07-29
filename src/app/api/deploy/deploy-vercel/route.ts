import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { deployToVercel } from "@/lib/deploy";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { projectId } = await request.json();
  const gate = await canUseFeature(user!.id, "deploy_vercel");
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

  const seoTitle = project.seo_title || project.name;
  const seoDescription = project.seo_description || project.description || "";
  const filesToDeploy: Record<string, string> = {
    ...(version.files as Record<string, string>),
    "app/layout.tsx": `import type { Metadata } from "next";

export const metadata: Metadata = {
  title: ${JSON.stringify(seoTitle)},
  description: ${JSON.stringify(seoDescription)},
  ${project.seo_og_image_url ? `openGraph: { images: [${JSON.stringify(project.seo_og_image_url)}] },` : ""}
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
  };

  const { data: deployment } = await supabase
    .from("deployments")
    .insert({ project_id: projectId, provider: "vercel", status: "queued" })
    .select("id")
    .single();

  try {
    const { data: connection } = await supabase
      .from("deploy_connections")
      .select("access_token")
      .eq("user_id", user!.id)
      .eq("provider", "vercel")
      .maybeSingle();

    const result = await deployToVercel(project.name, filesToDeploy, connection?.access_token);
    await supabase
      .from("deployments")
      .update({ deployment_url: result.deploymentUrl, status: result.status, logs: result.logs ?? null })
      .eq("id", deployment!.id);

    if (result.status === "error") {
      return NextResponse.json({ message: result.logs ?? "Deployment failed." }, { status: 500 });
    }

    await spendCredits(user!.id, "deploy_vercel", { isAdmin: gate.isAdmin, projectId });
    await supabase.from("projects").update({ status: "deployed" }).eq("id", projectId);

    return NextResponse.json({ deploymentUrl: result.deploymentUrl, status: result.status });
  } catch (err) {
    console.error("deploy-vercel error", err, "user:", user!.id);
    await supabase.from("deployments").update({ status: "error" }).eq("id", deployment!.id);
    return NextResponse.json(
      { message: "Vercel isn't connected yet — add VERCEL_API_TOKEN to your environment." },
      { status: 500 }
    );
  }
}
