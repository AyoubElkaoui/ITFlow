"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { bottomBarItems, moreItems, adminItems } from "@/lib/nav-items";

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const [moreOpen, setMoreOpen] = useState(false);

  const stripped = pathname.replace(/^\/(nl|en)/, "") || "/";

  const isActive = (href: string) => {
    if (href === "/") return stripped === "/";
    return stripped === href || stripped.startsWith(href + "/");
  };

  // Alles wat niet in de bottom-bar staat (+ admin voor admins) valt onder "Meer".
  const overflow = [...moreItems, ...(isAdmin ? adminItems : [])];
  const moreActive = overflow.some((i) => isActive(i.href));

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
        <div className="fixed bottom-16 left-0 right-0 z-50 md:hidden max-h-[70vh] overflow-y-auto bg-card border-t border-border rounded-t-2xl shadow-xl pb-safe">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
            <span className="font-semibold text-sm">Meer pagina&apos;s</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="text-muted-foreground p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 p-4">
            {moreItems.map(({ href, icon: Icon, nameKey }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors",
                  isActive(href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-[10px] text-center leading-tight">
                  {t(nameKey)}
                </span>
              </Link>
            ))}
          </div>

          {isAdmin && (
            <>
              <div className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("admin")}
              </div>
              <div className="grid grid-cols-4 gap-1 px-4 pb-4">
                {adminItems.map(({ href, icon: Icon, nameKey }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors",
                      isActive(href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-[10px] text-center leading-tight">
                      {t(nameKey)}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-sm">
        <div
          className="grid grid-cols-5"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Home + Tickets (eerste twee primary) */}
          {bottomBarItems.slice(0, 2).map(({ href, icon: Icon, nameKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-16 transition-colors",
                isActive(href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{t(nameKey)}</span>
            </Link>
          ))}

          {/* Nieuw ticket FAB */}
          <Link
            href="/tickets/new"
            className="flex flex-col items-center justify-center h-16"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg -mt-3">
              <Plus className="h-6 w-6" />
            </div>
          </Link>

          {/* Overige primary (Uren) */}
          {bottomBarItems.slice(2).map(({ href, icon: Icon, nameKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-16 transition-colors",
                isActive(href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{t(nameKey)}</span>
            </Link>
          ))}

          {/* Meer */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-16 w-full transition-colors",
              moreOpen || moreActive ? "text-primary" : "text-muted-foreground",
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
