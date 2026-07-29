import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { projectId, files } = (await request.json()) as {
    projectId: string;
    files: Record<string, string>;
  };
  if (!projectId || !files) {
    return NextResponse.json({ message: "projectId and files are required." }, { status: 400 });
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

  const { error } = await supabase
    .from("project_versions")
    .update({ files })
    .eq("project_id", projectId)
    .eq("version", project.current_version);

  if (error) {
    return NextResponse.json({ message: "Autosave failed." }, { status: 500 });
  }

  await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);

  return NextResponse.json({ ok: true });
}
