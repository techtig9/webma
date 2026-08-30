import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

// The homepage already has a #pricing anchor section, but that only resolves
// for visitors who land on "/" first — a direct link (ads, social, search,
// an email campaign) to "/pricing" 404'd before this route existed. This
// reuses the exact same Pricing/FAQ components so the content never drifts
// out of sync with the homepage version.
export const metadata: Metadata = {
  title: "Pricing",
  description: "Founding member pricing — 20% off every paid plan, locked in for as long as you stay subscribed.",
  openGraph: {
    title: "Pricing — Webma",
    description: "Founding member pricing — 20% off every paid plan, locked in for as long as you stay subscribed.",
  },
};

export const revalidate = 3600;

export default function PricingPage() {
  return (
    <main>
      <Navbar />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
