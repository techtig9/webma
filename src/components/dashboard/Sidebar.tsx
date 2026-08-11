"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  Sparkles,
  Settings,
  CreditCard,
  UserRound,
  Users,
  Globe,
  ShieldCheck,
  MessageSquare,
  LayoutGrid,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/generator", label: "AI Generator", icon: Sparkles },
  { href: "/dashboard/domains", label: "Domains", icon: Globe },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, { href: "/admin", label: "Admin Panel", icon: LayoutGrid }] : ITEMS;

  return (
    <aside className="glass-panel hidden w-60 shrink-0 !rounded-none !border-y-0 !border-l-0 md:flex md:flex-col">
      <div className="px-6 py-6">
        <Link href="/">
          <Logo size={20} />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 hover:translate-x-0.5 ${
                active
                  ? "border border-signal/30 bg-signal/15 text-signal"
                  : "border border-transparent text-ink/70 hover:bg-ink/5"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
            }
