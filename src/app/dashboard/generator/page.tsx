import { GeneratorFlow } from "@/components/generator/GeneratorFlow";
import { createClient } from "@/lib/supabase/server";
import { deriveSections, resolvePages } from "@/lib/preview";

export default async function GeneratorPage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  let initialProject = null;

  if (searchParams.project) {
    const supabase = createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, description")
      .eq("id", searchParams.project)
      .single();

    if (project) {
      const { data: version } = await supabase
        .from("project_versions")
        .select("files, pages")
        .eq("project_id", project.id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (version) {
        const files = version.files as Record<string, string>;
        initialProject = {
          projectId: project.id,
          name: project.name,
          description: project.description ?? "",
          files,
          sections: deriveSections(files),
          pages: resolvePages(files, version.pages as ReturnType<typeof resolvePages> | null),
        };
      }
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">AI Generator</h1>
      <GeneratorFlow initialProject={initialProject} />
    </div>
  );
        }
