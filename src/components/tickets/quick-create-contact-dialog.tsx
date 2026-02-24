"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import { contactCreateSchema, type ContactCreateInput } from "@/lib/validations";
import { useCreateContact } from "@/hooks/use-contacts";
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

interface QuickCreateContactDialogProps {
  companyId: string;
  onCreated: (contact: { id: string; name: string }) => void;
}

export function QuickCreateContactDialog({
  companyId,
  onCreated,
}: QuickCreateContactDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const tnt = useTranslations("newTicket");
  const ttoast = useTranslations("toasts");
  const createContact = useCreateContact();

  const form = useForm<ContactCreateInput>({
    resolver: typedResolver(contactCreateSchema),
    defaultValues: {
      companyId,
      name: "",
      email: "",
      phone: "",
      function: "",
      isPrimary: false,
      isActive: true,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(data: ContactCreateInput) {
    try {
      const result = (await createContact.mutateAsync({
        ...data,
        companyId,
      })) as {
        id: string;
        name: string;
      };
      toast.success(ttoast("created", { entity: t("name") }));
      onCreated(result);
      setOpen(false);
      reset();
    } catch {
      toast.error(
        ttoast("failed", { action: "create", entity: t("name") })
      );
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      reset({
        companyId,
        name: "",
        email: "",
        phone: "",
        function: "",
        isPrimary: false,
        isActive: true,
      });
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={() => handleOpenChange(true)}
        disabled={!companyId}
        title={tnt("quickAddContact")}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("quickCreate")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-contact-name">
                {t("name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quick-contact-name"
                placeholder={t("name")}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-contact-email">{t("email")}</Label>
              <Input
                id="quick-contact-email"
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
              <Label htmlFor="quick-contact-phone">{t("phone")}</Label>
              <Input
                id="quick-contact-phone"
                placeholder={tc("phone")}
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-contact-function">
                {t("functionRole")}
              </Label>
              <Input
                id="quick-contact-function"
                placeholder={t("functionPlaceholder")}
                {...register("function")}
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
