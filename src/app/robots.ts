import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://webma.ai";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /dashboard and /admin are kept out of search results via each
      // route's own `robots: { index: false }` metadata instead of being
      // named here — a security scan correctly flagged listing them as
      // information disclosure: robots.txt is a public file, so a
      // disallow rule advertises exactly where the authenticated areas
      // live without adding any actual protection (real access control is
      // the auth check in middleware.ts). /api stays listed since it's
      // pure crawl-budget hygiene, not a path anyone needs hidden.
      disallow: ["/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
