import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { AIDemo } from "@/components/landing/AIDemo";
import { Templates } from "@/components/landing/Templates";
import { Proof } from "@/components/landing/Proof";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { Help } from "@/components/landing/Help";
import { About } from "@/components/landing/About";
import { Footer } from "@/components/landing/Footer";
import type { Metadata } from "next";

// Nothing on this page is per-request (no auth, no user data) — cache the render
// and revalidate hourly instead of doing full server work on every visit.
export const revalidate = 3600;

// Scoped to this page specifically rather than the root layout — setting
// alternates.canonical on the shared layout would make every page that
// doesn't override it (login, signup, forgot-password) inherit "/" as ITS
// canonical too, which is wrong. Only the homepage needed this.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <WhoItsFor />
      <AIDemo />
      <Templates />
      <Proof />
      <Pricing />
      <FAQ />
      <Help />
      <About />
      <Footer />
    </main>
  );
}
