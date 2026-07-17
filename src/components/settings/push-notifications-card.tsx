"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, BellRing, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  isPushSupported,
  getPushSubscription,
  enablePush,
  disablePush,
} from "@/lib/push-client";

type Status = "loading" | "unsupported" | "off" | "on";

export function PushNotificationsCard() {
  const t = useTranslations("settings.push");
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isPushSupported()) {
        if (active) setStatus("unsupported");
        return;
      }
      const sub = await getPushSubscription();
      if (active) setStatus(sub ? "on" : "off");
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      await enablePush();
      setStatus("on");
      toast.success(t("enabled"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("enableFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      await disablePush();
      setStatus("off");
      toast.success(t("disabled"));
    } catch {
      toast.error(t("disableFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t("label")}</span>
              {status === "on" ? (
                <Badge variant="default">
                  <BellRing className="mr-1 h-3 w-3" />
                  {t("statusOn")}
                </Badge>
              ) : status === "off" ? (
                <Badge variant="secondary">
                  <BellOff className="mr-1 h-3 w-3" />
                  {t("statusOff")}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>

          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : status === "on" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisable}
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("disable")}
            </Button>
          ) : status === "off" ? (
            <Button size="sm" onClick={handleEnable} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("enable")}
            </Button>
          ) : null}
        </div>

        {status === "unsupported" && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("iosHint")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
