import * as Sentry from "@sentry/nextjs";

/**
 * Logs an error to the console (for local dev and Vercel function logs) AND
 * reports it to Sentry with context attached.
 *
 * Sentry's automatic Next.js instrumentation only captures exceptions that
 * escape a route handler uncaught. Every API route in this app deliberately
 * catches its errors and turns them into a normal JSON response (so a
 * client gets a real error message instead of a raw 500) — which means
 * those errors were previously invisible to Sentry entirely, logged only
 * to console/Vercel function logs that nobody is alerted on. Use this
 * instead of a bare console.error in any route's catch block so a real
 * operational failure (a broken payment provider, a failed deploy, an AI
 * provider outage) actually surfaces instead of silently accumulating in
 * logs nobody is watching.
 */
export function reportError(message: string, err: unknown, context?: Record<string, unknown>) {
  console.error(message, err, context ?? "");
  Sentry.captureException(err, { extra: { message, ...context } });
}
