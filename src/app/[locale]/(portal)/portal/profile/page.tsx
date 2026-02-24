"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { usePortalProfile, useUpdatePortalProfile } from "@/hooks/use-portal";
import { User, Lock, Phone, Briefcase, Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PortalProfilePage() {
  const t = useTranslations("portalProfile");
  const tc = useTranslations("common");

  const { data: profile, isLoading } = usePortalProfile();
  const updateProfile = useUpdatePortalProfile();

  // Profile form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileInitialized, setProfileInitialized] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Initialize form values when profile loads
  if (profile && !profileInitialized) {
    setName(profile.name);
    setPhone(profile.phone || "");
    setProfileInitialized(true);
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({ name, phone });
      toast.success(t("profileUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("updateFailed"));
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t("passwordsNoMatch"));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }

    try {
      await updateProfile.mutateAsync({ currentPassword, newPassword });
      toast.success(t("passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("passwordFailed"));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">{tc("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            {t("personalInfo")}
          </CardTitle>
          <CardDescription>{t("personalInfoDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{tc("name")} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5">
                {tc("email")}
              </Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t("emailReadonly")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {tc("phone")}
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {profile?.function && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  {t("function")}
                </Label>
                <Input value={profile.function} disabled className="bg-muted" />
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {tc("company")}
              </Label>
              <Input
                value={profile?.company.name || ""}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? tc("saving") : tc("saveChanges")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            {t("changePassword")}
          </CardTitle>
          <CardDescription>{t("changePasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending
                  ? t("changingPassword")
                  : t("changePassword")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
