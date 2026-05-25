"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Radio,
  Bot,
  Briefcase,
  AlertTriangle,
  Rss,
  AtSign,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/leaderboard", label: "Top Traders", icon: Users },
  { href: "/signals", label: "Signal Feed", icon: Radio },
  { href: "/scrapers", label: "Scrapers", icon: Rss },
  { href: "/x", label: "X Watchlist", icon: AtSign },
  { href: "/hormuz", label: "Hormuz 24/7", icon: AlertTriangle },
  { href: "/council", label: "AI Council", icon: Bot },
  { href: "/trades", label: "Trades", icon: Briefcase },
  { href: "/api-references", label: "API Refs", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r border-[var(--border)] bg-[var(--background-elevated)] md:block">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[10px] font-bold text-[var(--background)]">
          MC
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Market Council</span>
          <span className="text-[10px] uppercase tracking-wide text-[var(--foreground-muted)]">
            politics · war
          </span>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition",
                active
                  ? "bg-[var(--background-panel)] text-[var(--foreground)]"
                  : "text-[var(--foreground-muted)] hover:bg-[var(--background-panel)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon size={16} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
