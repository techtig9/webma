import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const metadata = { title: "Changelog" };

interface Entry {
  date: string;
  title: string;
  items: string[];
}

// Every entry here reflects a real, shipped change traceable to this
// repository's own migration files and commit history — no invented dates,
// features, or metrics. Grouped by the same dates used in
// supabase/migrations/ for the earlier entries, since those are the most
// reliable record of when each change actually landed.
const ENTRIES: Entry[] = [
  {
    date: "September 2026",
    title: "Referrals, billing options, and AI cost visibility",
    items: [
      "Invite-a-friend referral program — share your link, you and your friend each get bonus credits",
      "Monthly/yearly billing toggle on the pricing page",
      "Self-service data export from Settings",
      "Admin-facing AI usage and cost dashboard",
    ],
  },
  {
    date: "August 2026",
    title: "Template marketplace and admin tools",
    items: [
      "Searchable, filterable template marketplace with favorites and live preview",
      "100+ starter templates across 30 categories",
      "Admin tools for managing templates, subscriptions, and payments",
      "Form submissions and page-view analytics for published sites",
      "Personal API keys for programmatic access",
    ],
  },
  {
    date: "Earlier",
    title: "Initial release",
    items: [
      "AI website generation from a plain-language description",
      "Visual live preview with element selection and contextual AI editing",
      "Code editor with version history and export",
      "Credits and subscription billing",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/">
        <Logo />
      </Link>

      <h1 className="mt-8 font-display text-3xl font-bold">Changelog</h1>
      <p className="mt-1 text-sm text-ink/50">What&apos;s new in webma.</p>

      <div className="mt-10 space-y-10">
        {ENTRIES.map((entry) => (
          <section key={entry.date} className="border-l-2 border-signal/30 pl-5">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-signal">{entry.date}</p>
            <h2 className="mt-1 font-display font-bold text-ink">{entry.title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink/75">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
