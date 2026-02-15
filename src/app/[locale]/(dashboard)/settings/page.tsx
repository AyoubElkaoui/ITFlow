"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TwoFactorSetupDialog } from "@/components/auth/two-factor-setup-dialog";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const ta = useTranslations("auth.twoFactor");
  const { data: session, update } = useSession();
  const [showSetup, setShowSetup] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const user = session?.user as
    | { name?: string; email?: string; twoFactorEnabled?: boolean }
    | undefined;
  const is2faEnabled = user?.twoFactorEnabled ?? false;

  async function handleDisable2fa() {
    if (!confirm(ta("disableConfirm"))) return;
    setDisabling(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to disable 2FA");
        return;
      }
      toast.success(ta("disabled"));
      await update();
    } catch {
      toast.error("Failed to disable 2FA");
    } finally {
      setDisabling(false);
    }
  }

  function handleSetupClose(open: boolean) {
    setShowSetup(open);
    if (!open) {
      update();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("security")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {t("twoFactorAuth")}
                </span>
                <Badge variant={is2faEnabled ? "default" : "secondary"}>
                  {is2faEnabled ? (
                    <>
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      {t("enabled")}
                    </>
                  ) : (
                    <>
                      <ShieldOff className="mr-1 h-3 w-3" />
                      {t("disabled")}
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("twoFactorDescription")}
              </p>
            </div>
            {is2faEnabled ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisable2fa}
                disabled={disabling}
              >
                {disabling && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("disable2fa")}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowSetup(true)}>
                {t("enable2fa")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TwoFactorSetupDialog open={showSetup} onOpenChange={handleSetupClose} />
    </div>
  );
}
