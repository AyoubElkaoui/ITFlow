"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Ticket,
  Kanban,
  Clock,
  Building2,
  Monitor,
  BarChart3,
  Users,
  Shield,
  ScrollText,
  FileText,
  BookOpen,
  Timer,
  SlidersHorizontal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  nameKey: string;
  href: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  { nameKey: "dashboard", href: "/", icon: LayoutDashboard },
  { nameKey: "tickets", href: "/tickets", icon: Ticket },
  { nameKey: "board", href: "/tickets/board", icon: Kanban },
  { nameKey: "time", href: "/time", icon: Clock },
  { nameKey: "companies", href: "/companies", icon: Building2 },
  { nameKey: "contacts", href: "/contacts", icon: Users },
  { nameKey: "assets", href: "/assets", icon: Monitor },
  { nameKey: "reports", href: "/reports", icon: BarChart3 },
  { nameKey: "kb", href: "/kb", icon: BookOpen },
];

const adminNavigation: NavItem[] = [
  { nameKey: "users", href: "/admin/users", icon: Shield },
  { nameKey: "templates", href: "/admin/templates", icon: FileText },
  { nameKey: "sla", href: "/admin/sla", icon: Timer },
  {
    nameKey: "customFields",
    href: "/admin/custom-fields",
    icon: SlidersHorizontal,
  },
  { nameKey: "recurring", href: "/admin/recurring", icon: RefreshCw },
  { nameKey: "audit", href: "/admin/audit", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const [collapsed, setCollapsed] = useState(false);

  // Strip locale prefix for matching
  const strippedPath = pathname.replace(/^\/(nl|en)/, "") || "/";

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              IT
            </div>
            <span className="text-lg font-semibold">ITFlow</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              IT
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? strippedPath === "/"
              : strippedPath.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{t(item.nameKey)}</span>}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <Separator className="my-2" />
            {!collapsed && (
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("admin")}
              </div>
            )}
            {adminNavigation.map((item) => {
              const isActive = strippedPath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{t(item.nameKey)}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Settings */}
      <div className="border-t border-border p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            strippedPath.startsWith("/settings")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{t("settings" as any)}</span>}
        </Link>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
