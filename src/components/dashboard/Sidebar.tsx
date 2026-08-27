"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, LayoutTemplate, Sparkles, Settings, CreditCard, UserRound, Users, Globe, ShieldCheck, MessageSquare, LayoutGrid, Image as ImageIcon, BarChart3 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/assets", label: "Assets", icon: ImageIcon },
  { href: "/dashboard/generator", label: "AI Assistant", icon: Sparkles },
  { href: "/dashboard/domains", label: "Domains", icon: Globe },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/team", label: "Team", icon: Users },
];

const SECONDARY = [
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquare },
];

/** variant="drawer" and onNavigate are what MobileNav.tsx uses to reuse this
 * exact component (same nav items, same active-state logic, same "Build
 * with AI" card) inside a mobile slide-in overlay, instead of a second,
 * separately-maintained copy of the navigation list that could drift out of
 * sync with this one over time. */
export function Sidebar({ isAdmin = false, variant = "desktop", onNavigate }: { isAdmin?: boolean; variant?: "desktop" | "drawer"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = isAdmin ? [...MAIN, { href: "/admin", label: "Admin Panel", icon: LayoutGrid }] : MAIN;
  const link = (href: string, label: string, Icon: typeof LayoutDashboard) => {
    const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
    return <Link key={href} href={href} onClick={onNavigate} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${active ? "bg-signal/15 text-white shadow-inner" : "text-white/55 hover:bg-white/[0.05] hover:text-white"}`}>
      <Icon size={16} className={active ? "text-signal" : "text-white/40 group-hover:text-white/70"} />{label}
    </Link>;
  };

  return (
    <aside className={`${variant === "desktop" ? "hidden w-[248px] shrink-0 md:flex" : "flex w-full"} flex-col border-r border-white/[0.07] bg-[#090c15]/95`}>
      <div className="flex h-[72px] items-center border-b border-white/[0.07] px-6">
        <Link href="/" aria-label="Webma home" onClick={onNavigate}><Logo size={23} className="text-white" /></Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Workspace</p>
        <nav className="space-y-1">{items.map(({ href, label, icon: Icon }) => link(href, label, Icon))}</nav>
        <p className="mt-7 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Account</p>
        <nav className="space-y-1">{SECONDARY.map(({ href, label, icon: Icon }) => link(href, label, Icon))}</nav>
      </div>
      <div className="m-3 rounded-2xl border border-signal/20 bg-gradient-to-br from-signal/15 to-signal/5 p-4">
        <div className="mb-2 flex items-center gap-2"><Sparkles size={15} className="text-signal" /><span className="text-xs font-semibold text-white">Build with AI</span></div>
        <p className="text-[11px] leading-relaxed text-white/45">Describe a change and Webma can work on your current project.</p>
        <Link href="/dashboard/generator" onClick={onNavigate} className="mt-3 flex items-center justify-center rounded-lg bg-signal px-3 py-2 text-xs font-semibold text-white hover:bg-signal/90">Open assistant</Link>
      </div>
    </aside>
  );
}
