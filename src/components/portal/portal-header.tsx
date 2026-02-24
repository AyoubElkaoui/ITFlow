"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Ticket, User } from "lucide-react";
import { usePortalSession } from "@/hooks/use-portal";

export function PortalHeader() {
  const t = useTranslations("portal");
  const router = useRouter();
  const { data: session } = usePortalSession();

  async function handleLogout() {
    try {
      await fetch("/api/portal/auth/logout", { method: "POST" });
      // Router.push gebruiken voor correcte client-side navigatie
      router.push("/portal/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Redirect toch naar login bij fout
      router.push("/portal/login");
    }
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Ticket className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{t("title")}</span>
            {session?.companyName && (
              <span className="text-sm text-muted-foreground">
                — {session.companyName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/portal/profile">
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">
                {session?.contactName || t("profile")}
              </span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            {t("logout")}
          </Button>
        </div>
      </div>
    </header>
  );
}
