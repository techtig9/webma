import { Logo } from "@/components/ui/Logo";
import { Mail, Phone } from "lucide-react";

// Rebuilt from a minimal two-row footer into the reference's real 4-column
// structure. Every link points at a real, existing anchor or route on this
// site (#features, #templates, #pricing, #help, #about, #faq, /terms,
// /privacy) — the reference's own footer includes a physical mailing
// address, which isn't real information this project has, so it's
// deliberately omitted rather than invented. Contact details (email, phone)
// are the same real ones the previous footer already had, just given a
// proper column instead of being the only content.
const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Templates", href: "#templates" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    heading: "Support",
    links: [
      { label: "Help", href: "#help" },
      { label: "FAQ", href: "#faq" },
      { label: "About", href: "#about" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-ink/10 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-8">
            <Logo size={20} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/50">
              Describe your idea and webma designs, generates, and helps you publish a professional website —
              without starting from a blank canvas.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink/55">{col.heading}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-ink/60 hover:text-ink">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink/55">Connect</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="mailto:techtig9@gmail.com" className="flex items-center gap-2 text-ink/60 hover:text-ink">
                  <Mail size={14} /> techtig9@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+92348859789" className="flex items-center gap-2 text-ink/60 hover:text-ink">
                  <Phone size={14} /> +92 348 8597892
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-ink/10 pt-6 text-center text-xs text-ink/55">
          © {new Date().getFullYear()} Techtig. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
