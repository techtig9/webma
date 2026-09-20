import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Subprocessors" };

interface Subprocessor {
  name: string;
  purpose: string;
  dataShared: string;
  location: string;
}

// Every entry here corresponds to a real, currently-integrated service in
// this codebase (see .env.example / docs/DEPLOY_VERCEL.md) — nothing
// speculative or planned-but-not-built.
const SUBPROCESSORS: Subprocessor[] = [
  { name: "Supabase", purpose: "Database, authentication, file storage", dataShared: "Account data, generated site content, usage/credit records", location: "US (or your project's configured region)" },
  { name: "Anthropic", purpose: "AI: full website generation, complex edits", dataShared: "Your website description and edit instructions", location: "US" },
  { name: "Groq", purpose: "AI: lightweight edits, follow-up questions, voice transcription (Whisper)", dataShared: "Edit instructions; voice recordings for transcription only, not stored", location: "US" },
  { name: "Cerebras", purpose: "AI: lightweight edits (fallback if Groq is unavailable)", dataShared: "Edit instructions", location: "US" },
  { name: "OpenRouter", purpose: "AI: lightweight edits (fallback if Groq and Cerebras are unavailable)", dataShared: "Edit instructions", location: "Routes to various underlying model providers" },
  { name: "OpenAI", purpose: "AI image generation", dataShared: "Your image generation prompt", location: "US" },
  { name: "Paddle", purpose: "Payment processing and merchant of record", dataShared: "Billing details, purchase history", location: "UK/EU/US depending on your region" },
  { name: "Vercel", purpose: "Application hosting; deployment target for sites you publish", dataShared: "Application traffic; your site's code, if you deploy through us", location: "Global CDN" },
  { name: "Resend", purpose: "Transactional email delivery", dataShared: "Your email address, name, and the email's content", location: "US" },
  { name: "Upstash", purpose: "Rate limiting (production, multi-instance deployments)", dataShared: "Hashed identifiers used as rate-limit keys — no personal content", location: "Configurable region" },
  { name: "Sentry", purpose: "Error tracking (only if configured)", dataShared: "Error reports, which may include request context", location: "US/EU depending on your project" },
];

export default function SubprocessorsPage() {
  return (
    <LegalPage title="Subprocessors" updated="September 2026">
      <section>
        <p>
          These are the third-party services webma relies on to operate, and what each one sees. See
          our <a href="/privacy" className="text-signal hover:underline">Privacy Policy</a> for how we
          use this data overall, and our{" "}
          <a href="/ai-use" className="text-signal hover:underline">AI use disclosure</a> for more
          detail on the AI providers specifically.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase text-ink/50">
              <tr>
                <th className="py-2 pr-4">Subprocessor</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2 pr-4">Data shared</th>
                <th className="py-2">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name}>
                  <td className="py-2 pr-4 font-medium text-ink">{s.name}</td>
                  <td className="py-2 pr-4">{s.purpose}</td>
                  <td className="py-2 pr-4 text-ink/60">{s.dataShared}</td>
                  <td className="py-2 text-ink/60">{s.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink/50">
          Several of these are optional and only active if configured for a given deployment (e.g.
          Sentry, Upstash) — see this project&apos;s own <code className="rounded bg-ink/[0.06] px-1 py-0.5">.env.example</code>{" "}
          for exactly which environment variables enable each one.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">Changes to this list</h2>
        <p className="mt-2">
          We&apos;ll update this page when we add or remove a subprocessor. Material changes will be
          communicated before they take effect, consistent with our{" "}
          <a href="/privacy" className="text-signal hover:underline">Privacy Policy</a>.
        </p>
      </section>
    </LegalPage>
  );
}
