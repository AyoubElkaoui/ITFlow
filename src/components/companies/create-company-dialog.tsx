"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  companyCreateSchema,
  type CompanyCreateInput,
} from "@/lib/validations";
import { useCreateCompany } from "@/hooks/use-companies";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCompanyDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const createCompany = useCreateCompany();

  const form = useForm<CompanyCreateInput>({
    resolver: typedResolver(companyCreateSchema),
    defaultValues: {
      name: "",
      shortName: "",
      isActive: true,
    },
  });

  async function onSubmit(data: CompanyCreateInput) {
    try {
      await createCompany.mutateAsync(data);
      toast.success("Company created");
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create company",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addCompany")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("companyName")} *</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">{t("shortName")} *</Label>
              <Input
                id="shortName"
                placeholder={t("shortNamePlaceholder")}
                {...form.register("shortName")}
              />
              {form.formState.errors.shortName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.shortName.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{tc("email")}</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{tc("phone")}</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{tc("address")}</Label>
            <Input id="address" {...form.register("address")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">{t("contactPerson")}</Label>
              <Input id="contactPerson" {...form.register("contactPerson")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">{t("hourlyRate")}</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                {...form.register("hourlyRate")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{tc("notes")}</Label>
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending ? tc("creating") : t("createCompany")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
