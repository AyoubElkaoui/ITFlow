"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  contactUpdateSchema,
  type ContactUpdateInput,
} from "@/lib/validations";
import { useUpdateContact } from "@/hooks/use-contacts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CompanySelect } from "@/components/shared/company-select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    function: string | null;
    isPrimary: boolean;
    companyId: string;
    company: { id: string; name: string; shortName: string };
  };
}

export function EditContactDialog({ open, onOpenChange, contact }: Props) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const updateContact = useUpdateContact(contact.id);

  const form = useForm<ContactUpdateInput>({
    resolver: typedResolver(contactUpdateSchema),
    defaultValues: {
      companyId: contact.companyId,
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      function: contact.function ?? "",
      isPrimary: contact.isPrimary,
    },
  });

  useEffect(() => {
    form.reset({
      companyId: contact.companyId,
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      function: contact.function ?? "",
      isPrimary: contact.isPrimary,
    });
  }, [contact, form]);

  async function onSubmit(data: ContactUpdateInput) {
    try {
      await updateContact.mutateAsync(data);
      toast.success("Contact updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update contact",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editContact")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyId">{tc("company")} *</Label>
            <Controller
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <CompanySelect
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            {form.formState.errors.companyId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.companyId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{tc("name")} *</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">{tc("email")}</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{tc("phone")}</Label>
              <Input id="phone" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="function">{t("function")}</Label>
            <Input id="function" {...form.register("function")} />
            {form.formState.errors.function && (
              <p className="text-xs text-destructive">
                {form.formState.errors.function.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="isPrimary"
              render={({ field }) => (
                <Checkbox
                  id="isPrimary"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isPrimary">{t("primaryContact")}</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={updateContact.isPending}>
              {updateContact.isPending ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
