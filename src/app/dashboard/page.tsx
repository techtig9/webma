import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, updated_at")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-ink/50">Pick up a project or start something new.</p>
        </div>
        <Button href="/dashboard/generator">Generate a website</Button>
      </div>

      <div>
        <h2 className="mb-4 font-display font-bold">Recent projects</h2>
        {!projects?.length ? (
          <div className="rounded-2xl border border-dashed border-ink/15 p-10 text-center">
            <p className="text-sm text-ink/50">
              Nothing here yet. Your first generated site will show up in this list.
            </p>
            <Button href="/dashboard/generator" variant="secondary" className="mt-4">
              Start generating
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/generator?project=${p.id}`}
                className="glass-panel rounded-xl p-5 transition-colors hover:border-signal/40"
              >
                <p className="font-medium">{p.name}</p>
                <p className="mt-1 font-mono text-xs uppercase text-ink/40">{p.status}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
