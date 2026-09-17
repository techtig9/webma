// Phase 3: regenerates `structure.files` for every live template, keeping
// each row's existing id/category/name/pages (fetched fresh from production
// into pages_by_template.json) and its exact hand-authored hero headline/sub
// (from the original categories.mjs) untouched — only the JSX each
// component file contains changes, using gen2.mjs's varied section library
// instead of the old single-shape builders. File keys and page/section
// composition are left identical, so nothing referencing them breaks.

import { readFileSync, writeFileSync } from "fs";
import { CATEGORIES } from "./categories.mjs";
import * as esbuild from "esbuild";
import {
  pickIndex, PALETTES, TYPE_SYSTEMS,
  navbarVariants, heroVariants, footerVariants, pageHeaderVariants,
  aboutVariants, testimonialVariants, pricingVariants, contactFormVariants,
  gridVariants, statsVariants, locationVariants, buildThumbnailDataUri,
} from "./gen2.mjs";

const rows = JSON.parse(readFileSync("pages_by_template.json", "utf8"));

const CTA_PAIRS = [
  ["Get started", "See how it works"],
  ["Book a call", "Learn more"],
  ["Get in touch", "Explore"],
  ["Start now", "View details"],
  ["Talk to us", "See examples"],
];
const REVIEWER_NAMES = ["Jordan Lee", "Priya Shah", "Marcus Webb", "Alina Novak", "Theo Kwan", "Sofia Reyes", "Owen Clarke", "Nadia Farouk"];
const REVIEWER_ROLES = ["Founder", "Operations Lead", "Marketing Director", "Client", "General Manager", "Head of Growth"];
const ICONS = ["Zap", "Star", "Shield", "Sparkles", "Target", "Heart", "Award", "TrendingUp", "Users", "Clock", "CheckCircle", "Compass"];
const STAT_SETS = [
  [{ value: "500+", label: "Clients served" }, { value: "10 yrs", label: "In business" }, { value: "4.9/5", label: "Avg. rating" }],
  [{ value: "98%", label: "Satisfaction" }, { value: "24/7", label: "Support" }, { value: "50+", label: "Team members" }],
  [{ value: "1,200+", label: "Projects delivered" }, { value: "15", label: "Industries served" }, { value: "99%", label: "On-time delivery" }],
];

function pick(arr, id, salt) {
  return arr[pickIndex(id, salt, arr.length)];
}

function aboutBody(brand, industry, category) {
  const templates = [
    `${brand} is built around one idea: ${industry ?? category.toLowerCase()} shouldn't be complicated. We keep things clear, direct, and focused on what actually moves the needle.`,
    `We started ${brand} because the existing options in ${industry ?? category.toLowerCase()} were either too slow or too generic. Every decision here is made with our clients' actual outcomes in mind.`,
    `${brand} pairs real experience in ${industry ?? category.toLowerCase()} with a genuine focus on the people we work with — no jargon, no unnecessary steps, just results.`,
    `Behind ${brand} is a small, focused team that cares more about doing the work right than doing a lot of it. That's shaped everything about how we operate.`,
  ];
  return pick(templates, brand, "about-body");
}

function pageHeaderSub(category, industry) {
  const templates = [
    `Everything you need to know about how we approach ${industry ?? category.toLowerCase()}.`,
    `A closer look at what we do and how we do it.`,
    `Real work, real results — see it for yourself.`,
  ];
  return pick(templates, category + industry, "pageheader-sub");
}

function contactSub(category) {
  const templates = [
    "We usually reply within one business day.",
    "Tell us a bit about what you need — we'll take it from there.",
    "Questions, quotes, or just saying hello — we'd love to hear from you.",
  ];
  return pick(templates, category, "contact-sub");
}

function buildFiles(row) {
  const catEntry = CATEGORIES.find((c) => c.category === row.category);
  if (!catEntry) throw new Error(`No category entry for "${row.category}" (${row.name})`);
  const variant = catEntry.variants.find((v) => v.brand === row.name);
  if (!variant) throw new Error(`No variant matching brand "${row.name}" in category "${row.category}"`);

  const id = row.id;
  const palette = pick(PALETTES, id, "palette");
  const t = pick(TYPE_SYSTEMS, id, "type");
  const [primaryCta, secondaryCta] = pick(CTA_PAIRS, id, "cta");
  const stats = pick(STAT_SETS, id, "stats");
  const navLinks = row.pages.filter((p) => p.slug !== "index").map((p) => ({ href: p.path, label: p.name }));
  const extraPage = row.pages.find((p) => p.slug !== "index" && p.slug !== "contact");

  const roles = new Set();
  for (const p of row.pages) for (const s of p.sections) roles.add(s);

  const files = {};

  if (roles.has("Navbar")) {
    files["components/Navbar.tsx"] = pick(navbarVariants, id, "navbar")({ brand: row.name, links: navLinks, p: palette.primary, t });
  }
  if (roles.has("Hero")) {
    files["components/Hero.tsx"] = pick(heroVariants, id, "hero")({
      eyebrow: (catEntry.industry ?? row.category).toUpperCase(),
      headline: variant.headline,
      sub: variant.sub,
      primaryCta, secondaryCta,
      p: palette.primary, s: palette.secondary, t, stats,
    });
  }
  if (roles.has("Footer")) {
    files["components/Footer.tsx"] = pick(footerVariants, id, "footer")({
      brand: row.name, tagline: variant.sub, p: palette.primary, links: navLinks, t,
    });
  }
  if (roles.has("ContactForm")) {
    files["components/ContactForm.tsx"] = pick(contactFormVariants, id, "contact")({
      heading: "Get in touch", sub: contactSub(row.category), p: palette.primary, t,
      address: "123 Market Street, Suite 400", hours: "Mon–Fri, 9am–6pm",
    });
  }
  if (roles.has("PageHeader") && extraPage) {
    files["components/PageHeader.tsx"] = pick(pageHeaderVariants, id, "pageheader")({
      heading: extraPage.name, sub: pageHeaderSub(row.category, catEntry.industry), p: palette.primary, t,
    });
  }
  if (roles.has("About")) {
    files["components/About.tsx"] = pick(aboutVariants, id, "about")({
      heading: `About ${row.name}`, body: aboutBody(row.name, catEntry.industry, row.category),
      p: palette.primary, s: palette.secondary, t, reverse: pickIndex(id, "about-reverse", 2) === 1, stats,
    });
  }
  if (roles.has("Testimonial")) {
    files["components/Testimonial.tsx"] = pick(testimonialVariants, id, "testimonial")({
      quote: catEntry.vocab.length ? `${pick(catEntry.vocab, id, "testimonial-vocab").body} That's exactly what ${row.name} delivered.` : `${row.name} exceeded every expectation we had.`,
      name: pick(REVIEWER_NAMES, id, "reviewer-name"),
      role: pick(REVIEWER_ROLES, id, "reviewer-role"),
      p: palette.primary, s: palette.secondary, t,
    });
  }
  if (roles.has("Pricing")) {
    files["components/Pricing.tsx"] = pick(pricingVariants, id, "pricing")({
      heading: "Simple, transparent pricing", sub: "Choose the plan that fits — upgrade or cancel any time.",
      tiers: [
        { name: "Starter", price: "$29", period: "/mo", features: ["Core features", "Email support"], featured: false },
        { name: "Growth", price: "$79", period: "/mo", features: ["Everything in Starter", "Priority support", "Advanced reporting"], featured: true },
        { name: "Scale", price: "$199", period: "/mo", features: ["Everything in Growth", "Dedicated manager", "Custom integrations"], featured: false },
      ],
      p: palette.primary, t,
    });
  }
  if (roles.has("Stats")) {
    files["components/Stats.tsx"] = pick(statsVariants, id, "statsblock")({ stats, p: palette.primary, t });
  }
  if (roles.has("Location")) {
    files["components/Location.tsx"] = pick(locationVariants, id, "location")({
      heading: "Visit us", address: "123 Market Street, Suite 400", hours: "Mon–Fri, 9am–6pm", p: palette.primary, t,
    });
  }
  // Grid family: Features / Work / Catalog / Latest all draw from the same
  // 5-variant pool, each keyed by its own role name so a template using two
  // of them (e.g. Features on Home + Catalog on its extra page) can land on
  // two different variants and two different item sets.
  for (const role of ["Features", "Work", "Catalog", "Latest"]) {
    if (!roles.has(role)) continue;
    const items = catEntry.vocab.length >= 3 ? catEntry.vocab.slice(0, 6) : catEntry.vocab;
    const heading = role === "Features" ? `What ${row.name} offers`
      : role === "Work" ? "Selected work"
      : role === "Catalog" ? "What we offer"
      : "Latest updates";
    const sub = role === "Latest" ? "Recent posts and announcements." : `A closer look at what ${row.name} does best.`;
    files[`components/${role}.tsx`] = pick(gridVariants, id + ":" + role, "grid")({
      id: role, heading, sub, items, p: palette.primary, s: palette.secondary, t, icons: ICONS,
    });
  }

  return { files, palette, t, heroVariantIndex: pickIndex(id, "hero", heroVariants.length) };
}

// ---------------------------------------------------------------------------
// Run + validate
// ---------------------------------------------------------------------------
let errors = 0;
const results = [];
for (const row of rows) {
  try {
    const { files, palette, heroVariantIndex } = buildFiles(row);

    // Every section any page references must have a generated file.
    for (const p of row.pages) {
      for (const s of p.sections) {
        const key = `components/${s}.tsx`;
        if (!(key in files)) {
          console.error(`MISSING FILE: ${row.name} / page "${p.slug}" needs "${s}" but none generated`);
          errors++;
        }
      }
    }
    // Every generated file must be valid TSX.
    for (const [path, src] of Object.entries(files)) {
      try {
        esbuild.transformSync(src, { loader: "tsx" });
      } catch (e) {
        console.error(`SYNTAX ERROR: ${row.name} / ${path}: ${e.message.split("\n")[0]}`);
        errors++;
      }
      if (src.length < 30) {
        console.error(`SUSPICIOUSLY SHORT: ${row.name} / ${path}`);
        errors++;
      }
    }

    const thumbnail = buildThumbnailDataUri(palette.primary, palette.secondary, row.name, heroVariantIndex);
    results.push({ id: row.id, name: row.name, category: row.category, files, thumbnail });
  } catch (e) {
    console.error(`FATAL for ${row.name} (${row.category}): ${e.message}`);
    errors++;
  }
}

console.log(`\nProcessed ${results.length}/${rows.length} templates. ${errors} error(s).`);
writeFileSync("regenerated.json", JSON.stringify(results), "utf8");
process.exitCode = errors > 0 ? 1 : 0;
