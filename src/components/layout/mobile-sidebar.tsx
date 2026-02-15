"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Ticket,
  Clock,
  Building2,
  Monitor,
  BarChart3,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  { nameKey: "time", href: "/time", icon: Clock },
  { nameKey: "companies", href: "/companies", icon: Building2 },
  { nameKey: "assets", href: "/assets", icon: Monitor },
  { nameKey: "reports", href: "/reports", icon: BarChart3 },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  const strippedPath = pathname.replace(/^\/(nl|en)/, "") || "/";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              IT
            </div>
            <span className="text-lg font-semibold">ITFlow</span>
          </Link>
        </div>
        <nav className="space-y-1 p-2">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? strippedPath === "/"
                : strippedPath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{t(item.nameKey)}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
