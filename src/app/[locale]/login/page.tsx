"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { typedResolver } from "@/lib/form-utils";
import { Lock } from "lucide-react";

import { loginSchema } from "@/lib/validations";
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
import { TwoFactorVerifyForm } from "@/components/auth/two-factor-verify-form";

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: typedResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setError(null);

    try {
      // First, check if user has 2FA enabled
      const checkRes = await fetch("/api/auth/check-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (!checkRes.ok) {
        setError(t("invalidCredentials"));
        return;
      }

      const checkData = await checkRes.json();

      if (checkData.requires2FA) {
        // Show 2FA form
        setCredentials({ email: data.email, password: data.password });
        setShow2FA(true);
        return;
      }

      // No 2FA, sign in directly
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
      } else {
        router.push("/");
      }
    } catch {
      setError(t("errorOccurred"));
    }
  }

  function handle2FASuccess() {
    router.push("/");
  }

  function handle2FACancel() {
    setShow2FA(false);
    setCredentials(null);
    setError(null);
  }

  return (
    <div className="bg-background min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        {/* Branding */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-base">
            IT
          </div>
          <span className="text-2xl font-semibold">ITFlow</span>
        </div>

        {/* Login Card */}
        <Card>
          {show2FA && credentials ? (
            <CardContent className="pt-6">
              <TwoFactorVerifyForm
                email={credentials.email}
                password={credentials.password}
                onSuccess={handle2FASuccess}
                onCancel={handle2FACancel}
              />
            </CardContent>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">
                  {t("title")}
                </CardTitle>
                <CardDescription>
                  {t("description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      autoComplete="email"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password">{t("password")}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        placeholder={t("passwordPlaceholder")}
                        autoComplete="current-password"
                        className="pr-10"
                        {...register("password")}
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t("signingIn") : t("signIn")}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
