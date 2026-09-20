// Accessibility check before publish (fix-all.md's webma feature list) —
// distinct from the SEO panel (src/lib/seo-audit.ts), which already covers
// three genuinely WCAG-relevant checks (alt text, form labels, accessible
// names) as a side effect of being generally useful for SEO too. Rather
// than re-implementing those, this composes the same exported check
// functions and adds two checks seo-audit.ts doesn't have: a heading-level
// skip (WCAG 1.3.1) and vague link/button text (WCAG 2.4.4) — genuinely new
// coverage, not a second copy of what already exists.
import type { Page } from "@/lib/preview";
import { checkAltText, checkFormLabels, checkAccessibleNames, pageSource } from "@/lib/seo-audit";

export interface A11yIssue {
  severity: "error" | "warning";
  category: "alt-text" | "labels" | "accessible-names" | "heading-order" | "vague-link-text";
  message: string;
  pageSlug?: string;
}

export interface A11yAuditResult {
  score: number;
  issues: A11yIssue[];
}

const SEVERITY_PENALTY: Record<A11yIssue["severity"], number> = { error: 8, warning: 3 };

/** Flags a heading level skip (e.g. an <h1> followed directly by an <h3>,
 * with no <h2> in between) — screen reader users navigate by heading level,
 * and a skipped level reads as a broken outline. Only checks for skips
 * forward (a level appearing deeper than "previous level + 1"); jumping
 * back up any number of levels is always valid (e.g. h3 -> h2 -> h1 is a
 * normal nested-section pattern, not a skip). */
function checkHeadingOrder(source: string, page: Page): A11yIssue[] {
  const levels = [...source.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      return [
        {
          severity: "warning",
          category: "heading-order",
          message: `"${page.name}" jumps from <h${levels[i - 1]}> to <h${levels[i]}> — screen reader users navigating by heading level will miss a level.`,
          pageSlug: page.slug,
        },
      ];
    }
  }
  return [];
}

const VAGUE_LINK_TEXT = new Set(["click here", "here", "read more", "learn more", "more", "link", "this"]);

/** Flags <a>/<button> whose only visible text is a generic phrase like
 * "click here" — meaningless out of context to a screen reader user
 * tabbing through a page's link list in isolation (WCAG 2.4.4). Text-only
 * (like the other regex-based checks here): doesn't see JSX expressions or
 * nested elements, so a real dynamic label is never flagged since its
 * source text won't match one of the static phrases below. */
function checkVagueLinkText(source: string, page: Page): A11yIssue[] {
  const tags = [...source.matchAll(/<(a|button)\b[^>]*>([^<]*)<\/\1>/g)];
  const vague = tags.filter(([, , text]) => VAGUE_LINK_TEXT.has(text.trim().toLowerCase()));
  if (vague.length === 0) return [];
  return [
    {
      severity: "warning",
      category: "vague-link-text",
      message: `"${page.name}" has ${vague.length} link${vague.length === 1 ? "" : "s"}/button${vague.length === 1 ? "" : "s"} with generic text like "click here" — meaningless out of context for a screen reader user.`,
      pageSlug: page.slug,
    },
  ];
}

export function auditAccessibility(files: Record<string, string>, pages: Page[]): A11yAuditResult {
  const issues: A11yIssue[] = [];

  for (const page of pages) {
    const source = pageSource(files, page);
    // Cast is safe: checkAltText/checkFormLabels/checkAccessibleNames each
    // only ever produce their own single, fixed SeoIssue["category"] value
    // ("alt-text"/"labels"/"accessible-names" respectively), which is also
    // a valid A11yIssue["category"] — TypeScript just can't narrow a
    // function's return type down from the full SeoIssue union on its own.
    issues.push(...(checkAltText(source, page) as A11yIssue[]));
    issues.push(...(checkFormLabels(source, page) as A11yIssue[]));
    issues.push(...(checkAccessibleNames(files, page) as A11yIssue[]));
    issues.push(...checkHeadingOrder(source, page));
    issues.push(...checkVagueLinkText(source, page));
  }

  const deduction = issues.reduce((sum, i) => sum + SEVERITY_PENALTY[i.severity], 0);
  const score = Math.max(0, 100 - deduction);

  return { score, issues };
}
