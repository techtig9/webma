// A `next` path from a query string is only ever safe to redirect to if it's
// a genuine same-origin relative path — otherwise (an absolute or
// protocol-relative URL like `//evil.com`) a trusted post-login redirect
// could be turned into an open redirect. Split out of
// src/app/auth/callback/route.ts into its own module rather than exported
// directly from that file: Next's App Router route-file type-checking only
// permits the recognized handler/config exports from a route.ts, so an
// extra named export there fails the build's generated route types.
export function safeNextPath(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}
