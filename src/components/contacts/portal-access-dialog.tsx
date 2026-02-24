"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  useEnablePortalAccess,
  useDisablePortalAccess,
} from "@/hooks/use-contacts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Mail, ShieldCheck, ShieldOff } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    name: string;
    email: string | null;
    portalEnabled: boolean;
    company: { name: string };
  };
}

export function PortalAccessDialog({ open, onOpenChange, contact }: Props) {
  const t = useTranslations("contacts");
  const tp = useTranslations("portalAccess");
  const tc = useTranslations("common");

  const enablePortal = useEnablePortalAccess(contact.id);
  const disablePortal = useDisablePortalAccess(contact.id);

  const [sendEmail, setSendEmail] = useState(true);
  const [customPassword, setCustomPassword] = useState("");
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  function resetState() {
    setSendEmail(true);
    setCustomPassword("");
    setUseCustomPassword(false);
    setShowPassword(false);
    setGeneratedPassword(null);
  }

  async function handleEnable() {
    try {
      const result = await enablePortal.mutateAsync({
        sendEmail,
        ...(useCustomPassword && customPassword ? { password: customPassword } : {}),
      });
      setGeneratedPassword(result.password);
      if (result.emailSent) {
        toast.success(tp("enabledWithEmail"));
      } else if (result.emailError) {
        toast.warning(tp("enabledNoEmail"));
      } else {
        toast.success(tp("enabled"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tp("enableFailed"));
    }
  }

  async function handleDisable() {
    try {
      await disablePortal.mutateAsync();
      toast.success(tp("disabled"));
      resetState();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tp("disableFailed"));
    }
  }

  function handleCopyPassword() {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      toast.success(tp("passwordCopied"));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetState();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contact.portalEnabled ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            )}
            {tp("title")}
          </DialogTitle>
          <DialogDescription>
            {tp("description", { name: contact.name, company: contact.company.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status info */}
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
            <span className="text-sm font-medium">{tp("currentStatus")}:</span>
            {contact.portalEnabled ? (
              <span className="text-sm font-semibold text-green-600">{tc("active")}</span>
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">{tc("inactive")}</span>
            )}
          </div>

          {!contact.email && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{tp("noEmail")}</p>
            </div>
          )}

          {/* Generated password display */}
          {generatedPassword && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
              <Label className="text-sm font-medium text-green-700 dark:text-green-400">
                {tp("generatedPassword")}
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-2 py-1 text-sm dark:bg-green-900">
                  {showPassword ? generatedPassword : "\u2022".repeat(generatedPassword.length)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Enable form */}
          {!contact.portalEnabled && contact.email && !generatedPassword && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="useCustomPassword"
                  checked={useCustomPassword}
                  onCheckedChange={(c) => setUseCustomPassword(c === true)}
                />
                <Label htmlFor="useCustomPassword" className="text-sm font-normal">
                  {tp("useCustomPassword")}
                </Label>
              </div>

              {useCustomPassword && (
                <div className="space-y-2">
                  <Label htmlFor="customPassword">{tp("password")}</Label>
                  <Input
                    id="customPassword"
                    type={showPassword ? "text" : "password"}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder={tp("passwordPlaceholder")}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(c) => setSendEmail(c === true)}
                />
                <Label htmlFor="sendEmail" className="text-sm font-normal">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {tp("sendInviteEmail")}
                  </span>
                </Label>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
              {tc("close")}
            </Button>

            {contact.portalEnabled ? (
              <>
                {/* Reset password button */}
                <Button
                  variant="outline"
                  onClick={handleEnable}
                  disabled={enablePortal.isPending}
                >
                  {enablePortal.isPending ? tp("resetting") : tp("resetPassword")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={disablePortal.isPending}
                >
                  {disablePortal.isPending ? tp("disabling") : tp("disableAccess")}
                </Button>
              </>
            ) : (
              contact.email && !generatedPassword && (
                <Button
                  onClick={handleEnable}
                  disabled={enablePortal.isPending}
                >
                  {enablePortal.isPending ? tp("enabling") : tp("enableAccess")}
                </Button>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
