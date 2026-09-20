import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { Reveal } from "@/components/ui/Reveal";

export default async function ProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, archived, updated_at, current_version, template_id, templates(name)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  const projectIds = (projects ?? []).map((p) => p.id);

  // Page count and "live" preview URL both live outside the `projects` row
  // itself (project_versions.pages, deployments.deployment_url) — one extra
  // query each across every visible project, rather than an N+1 per card.
  const [{ data: versions }, { data: deployments }] = projectIds.length
    ? await Promise.all([
        supabase.from("project_versions").select("project_id, version, pages").in("project_id", projectIds),
        supabase
          .from("deployments")
          .select("project_id, deployment_url, status, created_at")
          .in("project_id", projectIds)
          .eq("status", "ready")
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const pageCountByProject = new Map<string, number>();
  for (const p of projects ?? []) {
    const currentVersion = (versions ?? []).find((v) => v.project_id === p.id && v.version === p.current_version);
    const pages = currentVersion?.pages;
    pageCountByProject.set(p.id, Array.isArray(pages) ? pages.length : 0);
  }

  const liveUrlByProject = new Map<string, string>();
  for (const d of deployments ?? []) {
    // Rows are ordered newest-first, so the first one seen per project is its
    // latest ready deployment — every later row for that project is skipped.
    if (!liveUrlByProject.has(d.project_id) && d.deployment_url) {
      liveUrlByProject.set(d.project_id, d.deployment_url);
    }
  }

  const cardProjects = (projects ?? []).map((p) => ({
    ...p,
    templateName: (p.templates as unknown as { name: string } | null)?.name ?? null,
    pageCount: pageCountByProject.get(p.id) ?? 0,
    liveUrl: liveUrlByProject.get(p.id) ?? null,
  }));

  const active = cardProjects.filter((p) => !p.archived);
  const archived = cardProjects.filter((p) => p.archived);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Projects</h1>
        <Button href="/dashboard/generator">New project</Button>
      </div>

      {!active.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">No projects yet — generate your first website to see it here.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 8) * 40}>
              <ProjectCard project={p} />
            </Reveal>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink/40">
            Archived ({archived.length})
          </h2>
          <div className="mt-4 grid gap-4 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
