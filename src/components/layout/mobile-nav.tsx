"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Ticket,
  Clock,
  Plus,
  MoreHorizontal,
  Building2,
  Monitor,
  Package,
  BookOpen,
  BarChart3,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [moreOpen, setMoreOpen] = useState(false);

  const stripped = pathname.replace(/^\/(nl|en)/, "") || "/";

  const isActive = (href: string) => {
    if (href === "/") return stripped === "/";
    return stripped.startsWith(href);
  };

  const morePages = [
    { href: "/companies", icon: Building2, label: t("companies") },
    { href: "/contacts", icon: Users, label: t("contacts") },
    { href: "/assets", icon: Monitor, label: t("assets") },
    { href: "/stock", icon: Package, label: t("stock") },
    { href: "/kb", icon: BookOpen, label: t("kb") },
    { href: "/reports", icon: BarChart3, label: t("reports") },
  ];

  return (
    <>
      {/* Meer sheet overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* Meer sheet */}
      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 md:hidden bg-card border-t border-border rounded-t-2xl shadow-xl pb-safe">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Meer pagina&apos;s</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="text-muted-foreground p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 p-4">
            {morePages.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors",
                  isActive(href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-[10px] text-center leading-tight">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="grid grid-cols-5" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {/* Dashboard */}
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-16 text-xs transition-colors",
              isActive("/") && stripped === "/"
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </Link>

          {/* Tickets */}
          <Link
            href="/tickets"
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-16 transition-colors",
              isActive("/tickets") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Ticket className="h-5 w-5" />
            <span className="text-[10px]">{t("tickets")}</span>
          </Link>

          {/* Nieuw ticket FAB */}
          <Link
            href="/tickets/new"
            className="flex flex-col items-center justify-center h-16"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg -mt-3">
              <Plus className="h-6 w-6" />
            </div>
          </Link>

          {/* Uren */}
          <Link
            href="/time"
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-16 transition-colors",
              isActive("/time") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Clock className="h-5 w-5" />
            <span className="text-[10px]">{t("time")}</span>
          </Link>

          {/* Meer */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-16 w-full transition-colors",
              moreOpen ||
              morePages.some(({ href }) => isActive(href))
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px]">Meer</span>
          </button>
        </div>
      </nav>
    </>
  );
}
