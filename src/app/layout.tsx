import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ChatWidget } from "@/components/ui/ChatWidget";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });
// Editorial accent font — warm serif, used sparingly for pull-quotes and section
// openers where the geometric Space Grotesk would feel too clinical.
const accent = Fraunces({ subsets: ["latin"], variable: "--font-accent", weight: ["500", "600"], style: ["italic", "normal"] });

export const metadata: Metadata = {
  title: "webma — Describe it. Watch it build itself.",
  description:
    "Describe the website you want, by typing or speaking, and webma generates a complete, responsive, ready-to-deploy site in minutes. Built by Techtig.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${accent.variable}`}>
      <body className="bg-paper text-ink font-body antialiased">
        <ToastProvider>
          {children}
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
