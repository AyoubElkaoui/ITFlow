"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogOut, Ticket, User } from "lucide-react";
import { usePortalSession } from "@/hooks/use-portal";

export function PortalHeader() {
  const t = useTranslations("portal");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session } = usePortalSession();

  // Op de loginpagina hoort geen ingelogde-gebruikersbalk te staan.
  const isLoginPage = pathname === "/portal/login";

  async function handleLogout() {
    try {
      await fetch("/api/portal/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Wis de client-side cache zodat naam/bedrijf niet blijven "hangen"
      // en navigeer naar de loginpagina.
      queryClient.clear();
      router.push("/portal/login");
    }
  }

  // Geen ingelogde-balk op de loginpagina. Op alle overige portalpagina's is de
  // gebruiker gegarandeerd ingelogd (de middleware stuurt anders door naar
  // login), dus tonen we de header daar altijd — ook als de naam nog laadt.
  if (isLoginPage) {
    return null;
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
