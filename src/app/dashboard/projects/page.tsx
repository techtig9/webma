import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

const statusStyle: Record<string, string> = {
  draft: "text-ink/40",
  ready: "text-signal",
  deployed: "text-signal2",
};

export default async function ProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, updated_at")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Projects</h1>
        <Button href="/dashboard/generator">New project</Button>
      </div>

      {!projects?.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">No projects yet — generate your first website to see it here.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/generator?project=${p.id}`}
              className="glass-panel rounded-xl p-5 transition-colors hover:border-signal/40"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{p.name}</p>
                <span className={`font-mono text-xs uppercase ${statusStyle[p.status] ?? ""}`}>{p.status}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-ink/50">{p.description}</p>
              <p className="mt-3 text-xs text-ink/30">
                Updated {new Date(p.updated_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
