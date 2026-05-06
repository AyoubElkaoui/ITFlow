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
} from "lucide-react";
import { useTranslations } from "next-intl";

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const stripped = pathname.replace(/^\/(nl|en)/, "") || "/";

  const isActive = (href: string) => {
    if (href === "/") return stripped === "/";
    return stripped.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-sm safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {/* Dashboard */}
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
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
            "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
            isActive("/tickets")
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <Ticket className="h-5 w-5" />
          <span className="text-[10px]">{t("tickets")}</span>
        </Link>

        {/* New Ticket FAB */}
        <Link
          href="/tickets/new"
          className="flex flex-col items-center justify-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg -mt-4">
            <Plus className="h-6 w-6" />
          </div>
        </Link>

        {/* Uren */}
        <Link
          href="/time"
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
            isActive("/time")
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px]">{t("time")}</span>
        </Link>

        {/* Meer */}
        <Link
          href="/companies"
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
            isActive("/companies") || isActive("/assets") || isActive("/kb")
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px]">Meer</span>
        </Link>
      </div>
    </nav>
  );
}
