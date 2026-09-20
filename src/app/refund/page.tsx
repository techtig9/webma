import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy" updated="September 2026">
      <section>
        <h2 className="font-display font-bold text-ink">1. Subscriptions</h2>
        <p className="mt-2">
          Paid plans are billed monthly (or yearly, if you choose annual billing) in advance. Canceling
          stops future billing but doesn&apos;t refund the current period — you keep access to your plan
          until it ends, per our <a href="/terms" className="text-signal hover:underline">Terms</a>.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">2. When we do issue a refund</h2>
        <p className="mt-2">We&apos;ll refund a charge, in whole or in part, when:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>You were charged due to a billing error on our end (e.g. double-charged, or charged after a cancellation that should have taken effect)</li>
          <li>A paid feature you were billed for was genuinely unavailable due to an outage on our side for a significant part of your billing period</li>
          <li>Required by law in your jurisdiction (e.g. statutory cooling-off periods)</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">3. When we generally don&apos;t</h2>
        <p className="mt-2">
          Because credits reset each billing cycle and don&apos;t carry over, and because generation
          itself has a real, immediate cost to us, we don&apos;t refund a subscription simply because you
          didn&apos;t use your full credit allowance, changed your mind after using the product, or are
          unhappy with AI-generated output quality (which we can&apos;t fully guarantee — see our{" "}
          <a href="/terms" className="text-signal hover:underline">Terms</a> §7).
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">4. Credit top-up purchases</h2>
        <p className="mt-2">
          One-off credit top-ups are non-refundable once any part of that purchase has been spent, for
          the same reason as above — the underlying AI cost is already incurred at the moment credits
          are spent, not at the moment of purchase.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">5. How to request one</h2>
        <p className="mt-2">
          Payments are processed by Paddle.com, our merchant of record — contact us first at{" "}
          <a href="mailto:techtig9@gmail.com" className="text-signal hover:underline">techtig9@gmail.com</a>{" "}
          with your account email and the charge in question, and we&apos;ll review it against the
          criteria above. Approved refunds are issued back to your original payment method through
          Paddle and may take several business days to appear, depending on your bank or card issuer.
        </p>
      </section>
    </LegalPage>
  );
}
