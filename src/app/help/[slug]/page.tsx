import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { HELP_ARTICLES } from "@/lib/help";

// Static import map — same pattern as the blog's [slug] page. Four known
// articles, added by hand alongside their meta entry in src/lib/help.ts.
const ARTICLE_COMPONENTS = {
  "getting-started": () => import("@/content/help/getting-started.mdx"),
  "understanding-credits": () => import("@/content/help/understanding-credits.mdx"),
  "deploying-your-site": () => import("@/content/help/deploying-your-site.mdx"),
  "custom-domains": () => import("@/content/help/custom-domains.mdx"),
} as const;

export function generateStaticParams() {
  return Object.keys(ARTICLE_COMPONENTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const meta = HELP_ARTICLES[params.slug];
  if (!meta) return {};
  return { title: meta.title, description: meta.description };
}

export default async function HelpArticlePage({ params }: { params: { slug: string } }) {
  const meta = HELP_ARTICLES[params.slug];
  const loadArticle = ARTICLE_COMPONENTS[params.slug as keyof typeof ARTICLE_COMPONENTS];
  if (!meta || !loadArticle) {
    notFound();
  }

  const { default: Article } = await loadArticle();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/help">
        <Logo />
      </Link>

      <p className="mt-8 font-mono text-xs uppercase tracking-[0.15em] text-signal">{meta.category}</p>
      <h1 className="mt-1 font-display text-3xl font-bold">{meta.title}</h1>

      <article className="mt-4">
        <Article />
      </article>
    </main>
  );
}
