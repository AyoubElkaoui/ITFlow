"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckCircle2, Copy, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TwoFactorSetupDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("auth.twoFactor");
  const tc = useTranslations("common");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [token, setToken] = useState<string>("");

  function handleClose(value: boolean) {
    if (!value) {
      setStep(1);
      setQrCode("");
      setSecret("");
      setToken("");
    }
    onOpenChange(value);
  }

  async function handleGetStarted() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to initiate 2FA setup");
        return;
      }
      const data = await res.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep(2);
    } catch {
      toast.error("Failed to initiate 2FA setup");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (token.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Verification failed");
        return;
      }

      setStep(3);
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(secret);
    toast.success(t("copySecret"));
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("enable")}
              </DialogTitle>
              <DialogDescription>{t("enableDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={handleGetStarted} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("getStarted")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>{t("scanQrCode")}</DialogTitle>
              <DialogDescription>{t("scanDescription")}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4">
              {qrCode && (
                <div className="rounded-lg border bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="2FA QR Code" className="h-48 w-48" />
                </div>
              )}

              <div className="w-full space-y-1">
                <p className="text-sm text-muted-foreground text-center">
                  {t("manualKey")}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono text-center break-all">
                    {secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopySecret}
                    title={t("copySecret")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="w-full space-y-2">
                <label htmlFor="totp-code" className="text-sm font-medium">
                  {t("verificationCode")}
                </label>
                <Input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest font-mono"
                  value={token}
                  onChange={(e) =>
                    setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && token.length === 6) {
                      handleVerify();
                    }
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleVerify}
                disabled={loading || token.length !== 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("verifyEnable")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                {t("enabled")}
              </DialogTitle>
              <DialogDescription>{t("enabledDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>{t("done")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
