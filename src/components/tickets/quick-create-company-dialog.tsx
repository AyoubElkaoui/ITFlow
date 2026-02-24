"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import { companyCreateSchema, type CompanyCreateInput } from "@/lib/validations";
import { useCreateCompany } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface QuickCreateCompanyDialogProps {
  onCreated: (company: { id: string; name: string; shortName: string }) => void;
}

export function QuickCreateCompanyDialog({
  onCreated,
}: QuickCreateCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const tnt = useTranslations("newTicket");
  const ttoast = useTranslations("toasts");
  const createCompany = useCreateCompany();

  const form = useForm<CompanyCreateInput>({
    resolver: typedResolver(companyCreateSchema),
    defaultValues: {
      name: "",
      shortName: "",
      email: "",
      phone: "",
      isActive: true,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(data: CompanyCreateInput) {
    try {
      const result = (await createCompany.mutateAsync(data)) as {
        id: string;
        name: string;
        shortName: string;
      };
      toast.success(ttoast("created", { entity: tc("company") }));
      onCreated(result);
      setOpen(false);
      reset();
    } catch {
      toast.error(
        ttoast("failed", { action: "create", entity: tc("company") })
      );
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={() => setOpen(true)}
        title={tnt("quickAddCompany")}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("quickCreate")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-company-name">
                {t("companyName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quick-company-name"
                placeholder={t("companyName")}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-company-shortName">
                {t("shortName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quick-company-shortName"
                placeholder={t("shortNamePlaceholder")}
                {...register("shortName")}
              />
              {errors.shortName && (
                <p className="text-sm text-destructive">
                  {errors.shortName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-company-email">{t("email")}</Label>
              <Input
                id="quick-company-email"
                type="email"
                placeholder={tc("email")}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-company-phone">{t("phone")}</Label>
              <Input
                id="quick-company-phone"
                placeholder={tc("phone")}
                {...register("phone")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tc("creating") : tc("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
