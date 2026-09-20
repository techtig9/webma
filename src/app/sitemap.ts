import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://webma.ai";

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/changelog`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.4 },
    { url: `${base}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/refund`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/cookies`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/subprocessors`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/ai-use`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.1 },
  ];
}
