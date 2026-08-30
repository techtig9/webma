import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/error-report";

interface ShowcaseTemplate {
  id: string;
  category: string;
  name: string;
  thumbnail: string | null;
}

// Fallback shown only if the live query fails (network hiccup, migration not
// yet applied) — the section still renders something reasonable rather than
// throwing and taking the whole marketing homepage down with it, since this
// is the only DB read the public landing page makes.
const FALLBACK: ShowcaseTemplate[] = [
  { id: "fallback-business", category: "Business", name: "Business", thumbnail: null },
  { id: "fallback-portfolio", category: "Portfolio", name: "Portfolio", thumbnail: null },
  { id: "fallback-restaurant", category: "Restaurant", name: "Restaurant", thumbnail: null },
  { id: "fallback-travel", category: "Travel", name: "Travel", thumbnail: null },
  { id: "fallback-education", category: "Education", name: "Education", thumbnail: null },
  { id: "fallback-agency", category: "Agency", name: "Agency", thumbnail: null },
];

/** The 16 featured templates (one per category, see the seed migration)
 * ordered by real use_count — an honest "popular starting points" rail
 * rather than a hand-picked or arbitrary subset. Server Component: this
 * queries the same `templates` table the authenticated marketplace
 * (dashboard/templates) does, via the service-role client since this data
 * is meant to be public-showcase content regardless of RLS on the
 * authenticated read path. */
async function getShowcaseTemplates(): Promise<ShowcaseTemplate[]> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("templates")
      .select("id, category, name, thumbnail")
      .eq("is_featured", true)
      .order("use_count", { ascending: false })
      .limit(9);
    if (error || !data || data.length === 0) throw error ?? new Error("no featured templates returned");
    return data;
  } catch (err) {
    reportError("landing templates showcase query failed", err);
    return FALLBACK;
  }
}

export async function Templates() {
  const templates = await getShowcaseTemplates();

  return (
    <section id="templates" className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        eyebrow="Starting points"
        title="A template for whatever you're building"
        description="Every category below ships with multiple themes — or skip templates entirely and generate from scratch."
      />
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {templates.map((t, i) => (
          <Reveal key={t.id} delay={(i % 3) * 60}>
            <Link
              href="/signup"
              className="lift-on-hover shine-hover glass-panel group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl transition-colors hover:border-signal/40"
              aria-label={`Start a ${t.name} website`}
            >
              {t.thumbnail ? (
                <Image
                  src={t.thumbnail}
                  alt=""
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-signal/15 to-violet/10" />
              )}
              <div className="relative z-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 pt-10">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">{t.category}</span>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="font-display font-bold text-white">{t.name}</p>
                  <ArrowUpRight
                    size={16}
                    className="shrink-0 -translate-x-1 text-white/0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-white/80"
                  />
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
