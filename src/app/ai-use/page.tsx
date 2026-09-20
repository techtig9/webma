import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "AI Use Disclosure" };

export default function AiUsePage() {
  return (
    <LegalPage title="AI Use Disclosure" updated="September 2026">
      <section>
        <h2 className="font-display font-bold text-ink">1. What AI does in webma</h2>
        <p className="mt-2">
          webma&apos;s core function is AI website generation: you describe a site in plain language, and
          an AI model plans its structure and writes the React/Tailwind code for it. AI is also used
          for section-level editing, restyling, generating new pages, answering follow-up questions
          during setup, the in-app assistant chat, voice-prompt transcription, and optional AI image
          generation. Nothing else on webma (billing, authentication, analytics, admin tools) uses AI.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">2. Which model does what</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Anthropic Claude</strong> — full website generation, generating a site from a reference URL, and complete regeneration (the more complex, multi-page reasoning tasks).</li>
          <li><strong>Groq, with Cerebras and OpenRouter as automatic fallbacks</strong> — lighter tasks: single-section edits, theme changes, generating one new page, follow-up questions, and the assistant chat.</li>
          <li><strong>Groq (Whisper)</strong> — transcribes a voice recording into text for the AI prompt.</li>
          <li><strong>OpenAI</strong> — generates images when you use the AI image feature; a separate pipeline from website code generation.</li>
        </ul>
        <p className="mt-2">
          Which provider actually handled a given generation isn&apos;t shown in the product today, but
          this list is accurate as of the date above — see our{" "}
          <a href="/subprocessors" className="text-signal hover:underline">Subprocessors</a> page for
          the full provider list including non-AI services.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">3. Limitations</h2>
        <p className="mt-2">
          Generated code and copy can contain mistakes, outdated information, or content that needs
          editing before it&apos;s ready to publish — AI generation is a starting point, not a guarantee
          of accuracy or fitness for any particular purpose. Review a generated site, especially any
          factual claims, contact information, or legal-sounding text it produced, before publishing
          it. See our <a href="/terms" className="text-signal hover:underline">Terms</a> §7 for the
          full no-warranty language.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">4. Caching</h2>
        <p className="mt-2">
          To avoid re-billing an identical request, webma caches AI responses keyed by a hash of the
          task type and the exact prompt — never linked to your account or identity, and never shared
          across different prompts. A repeated identical action (e.g. clicking "regenerate" without
          changing anything) may return a cached result instead of a fresh AI call.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">5. Your content and AI training</h2>
        <p className="mt-2">
          We don&apos;t use your website descriptions, generated code, or account data to train our own
          models. Whether a given AI provider uses API traffic to improve their own models is governed
          by that provider&apos;s own terms, not by us — see Anthropic&apos;s, Groq&apos;s, Cerebras&apos;s,
          OpenRouter&apos;s, and OpenAI&apos;s own policies for their specific commitments.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">6. Questions</h2>
        <p className="mt-2">
          <a href="mailto:techtig9@gmail.com" className="text-signal hover:underline">techtig9@gmail.com</a>
        </p>
      </section>
    </LegalPage>
  );
}
