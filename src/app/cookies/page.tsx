import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Cookie Policy" };

const COOKIES = [
  { name: "Supabase auth session", purpose: "Keeps you signed in.", duration: "Until you log out or it expires", essential: true },
  { name: "webma_ref", purpose: "Remembers a referral code between clicking a referral link and finishing signup.", duration: "7 days", essential: false },
];

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" updated="September 2026">
      <section>
        <h2 className="font-display font-bold text-ink">1. What we use cookies for</h2>
        <p className="mt-2">
          webma uses a small, fixed set of cookies — no third-party advertising or cross-site tracking
          cookies, and no cookie consent banner is needed for the ones below since they&apos;re either
          strictly necessary or aren&apos;t used to track you across sites.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase text-ink/50">
              <tr>
                <th className="py-2 pr-4">Cookie</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2 pr-4">Duration</th>
                <th className="py-2">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {COOKIES.map((c) => (
                <tr key={c.name}>
                  <td className="py-2 pr-4 font-mono text-xs">{c.name}</td>
                  <td className="py-2 pr-4">{c.purpose}</td>
                  <td className="py-2 pr-4 text-ink/60">{c.duration}</td>
                  <td className="py-2 text-ink/60">{c.essential ? "Essential" : "Functional"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">2. What we don&apos;t use cookies for</h2>
        <p className="mt-2">
          Our own visitor and page-view analytics (used to show you traffic on sites you generate) are
          cookie-free by design — a visit is counted from a salted, one-way hash of IP address and
          browser, computed server-side and never linked back to an individual or stored as a
          persistent identifier on your device.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">3. Sites you generate with webma</h2>
        <p className="mt-2">
          This policy covers webma.ai itself. A website you generate and publish is your own property
          and may set its own cookies depending on what you&apos;ve built into it or what third-party
          embeds you&apos;ve added — that&apos;s between you and your site&apos;s visitors, not covered here.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">4. Managing cookies</h2>
        <p className="mt-2">
          You can clear or block cookies from your browser settings at any time. Blocking the
          authentication cookie will sign you out and prevent signing back in, since it&apos;s required
          for the service to work.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">5. Questions</h2>
        <p className="mt-2">
          <a href="mailto:techtig9@gmail.com" className="text-signal hover:underline">techtig9@gmail.com</a>
        </p>
      </section>
    </LegalPage>
  );
}
