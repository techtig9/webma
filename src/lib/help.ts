// Help center articles (src/content/help/*.mdx) — same pattern as blog
// posts (src/lib/blog.ts): each file exports its own `meta` directly, no
// frontmatter-parsing dependency. Unlike blog posts, help articles publish
// immediately (no draft gate) — they document already-real, shipped
// features, not upcoming content awaiting review.
import { meta as gettingStarted } from "@/content/help/getting-started.mdx";
import { meta as understandingCredits } from "@/content/help/understanding-credits.mdx";
import { meta as deployingYourSite } from "@/content/help/deploying-your-site.mdx";
import { meta as customDomains } from "@/content/help/custom-domains.mdx";

export interface HelpArticleMeta {
  title: string;
  description: string;
  category: string;
}

export const HELP_ARTICLES: Record<string, HelpArticleMeta> = {
  "getting-started": gettingStarted,
  "understanding-credits": understandingCredits,
  "deploying-your-site": deployingYourSite,
  "custom-domains": customDomains,
};

export function listHelpArticles(): Array<{ slug: string; meta: HelpArticleMeta }> {
  return Object.entries(HELP_ARTICLES).map(([slug, meta]) => ({ slug, meta }));
}
