import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { listHelpArticles } from "@/lib/help";

export const metadata = { title: "Help Center" };

export default function HelpIndexPage() {
  const articlesByCategory = new Map<string, ReturnType<typeof listHelpArticles>>();
  for (const article of listHelpArticles()) {
    const list = articlesByCategory.get(article.meta.category) ?? [];
    list.push(article);
    articlesByCategory.set(article.meta.category, list);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/">
        <Logo />
      </Link>

      <h1 className="mt-8 font-display text-3xl font-bold">Help Center</h1>
      <p className="mt-1 text-sm text-ink/50">
        Guides for getting the most out of webma. Can&apos;t find what you need?{" "}
        <a href="/contact" className="text-signal hover:underline">Contact us</a>.
      </p>

      <div className="mt-10 space-y-8">
        {[...articlesByCategory.entries()].map(([category, articles]) => (
          <div key={category}>
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-signal">{category}</h2>
            <div className="mt-3 space-y-2">
              {articles.map(({ slug, meta }) => (
                <Link key={slug} href={`/help/${slug}`} className="lift-on-hover glass-panel block rounded-xl p-4">
                  <h3 className="font-display text-sm font-bold text-ink">{meta.title}</h3>
                  <p className="mt-1 text-sm text-ink/60">{meta.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
