"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  ticketUpdateSchema,
  type TicketUpdateInput,
} from "@/lib/validations";
import { useUpdateTicket } from "@/hooks/use-tickets";
import { useCompanies } from "@/hooks/use-companies";
import { useContacts } from "@/hooks/use-contacts";
import { useUsers } from "@/hooks/use-users";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface TicketData {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  companyId?: string;
  company: { id: string; name: string; shortName: string };
  contact: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  tasksPerformed: string | null;
  pcName: string | null;
  serialNumber: string | null;
  officeLicense: string | null;
  pendingTasks: string | null;
  equipmentTaken: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketData;
}

export function EditTicketDialog({ open, onOpenChange, ticket }: Props) {
  const t = useTranslations("tickets");
  const tn = useTranslations("newTicket");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tp = useTranslations("priority");
  const tcat = useTranslations("category");
  const ttoast = useTranslations("toasts");

  const updateTicket = useUpdateTicket(ticket.id);
  const { data: companies } = useCompanies(undefined, true) as {
    data: Array<{ id: string; name: string; shortName: string }> | undefined;
  };
  const { data: users } = useUsers() as {
    data: Array<{ id: string; name: string }> | undefined;
  };

  const form = useForm<TicketUpdateInput>({
    resolver: typedResolver(ticketUpdateSchema),
    defaultValues: {
      subject: ticket.subject,
      description: ticket.description ?? "",
      status: ticket.status as TicketUpdateInput["status"],
      priority: ticket.priority as TicketUpdateInput["priority"],
      category: (ticket.category as TicketUpdateInput["category"]) ?? undefined,
      companyId: ticket.company.id,
      contactId: ticket.contact?.id ?? undefined,
      assignedToId: ticket.assignedTo?.id ?? undefined,
      tasksPerformed: ticket.tasksPerformed ?? "",
      pcName: ticket.pcName ?? "",
      serialNumber: ticket.serialNumber ?? "",
      officeLicense: ticket.officeLicense ?? "",
      pendingTasks: ticket.pendingTasks ?? "",
      equipmentTaken: ticket.equipmentTaken ?? "",
    },
  });

  const selectedCompanyId = form.watch("companyId");

  const { data: contacts } = useContacts(selectedCompanyId || undefined);
  const contactList = (contacts as { id: string; name: string }[]) || [];

  useEffect(() => {
    form.reset({
      subject: ticket.subject,
      description: ticket.description ?? "",
      status: ticket.status as TicketUpdateInput["status"],
      priority: ticket.priority as TicketUpdateInput["priority"],
      category: (ticket.category as TicketUpdateInput["category"]) ?? undefined,
      companyId: ticket.company.id,
      contactId: ticket.contact?.id ?? undefined,
      assignedToId: ticket.assignedTo?.id ?? undefined,
      tasksPerformed: ticket.tasksPerformed ?? "",
      pcName: ticket.pcName ?? "",
      serialNumber: ticket.serialNumber ?? "",
      officeLicense: ticket.officeLicense ?? "",
      pendingTasks: ticket.pendingTasks ?? "",
      equipmentTaken: ticket.equipmentTaken ?? "",
    });
  }, [ticket, form]);

  async function onSubmit(data: TicketUpdateInput) {
    try {
      await updateTicket.mutateAsync(data);
      toast.success(ttoast("updated", { entity: "Ticket" }));
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : ttoast("failed", { action: "update", entity: "ticket" }),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("editTicket")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>{tn("basicInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Company */}
                <div className="space-y-2">
                  <Label className="text-base">
                    {tc("company")} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedCompanyId || ""}
                    onValueChange={(v) => {
                      form.setValue("companyId", v);
                      form.setValue("contactId", undefined);
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={tc("selectCompany")} />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.shortName} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <Label className="text-base">{t("contact")}</Label>
                  <Select
                    value={form.watch("contactId") || "none"}
                    onValueChange={(v) =>
                      form.setValue("contactId", v === "none" ? undefined : v)
                    }
                    disabled={!selectedCompanyId}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={tn("selectContact")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tc("none")}</SelectItem>
                      {contactList.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned To */}
              <div className="space-y-2">
                <Label className="text-base">{t("assignedTo")}</Label>
                <Select
                  value={form.watch("assignedToId") || "none"}
                  onValueChange={(v) =>
                    form.setValue("assignedToId", v === "none" ? undefined : v)
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tc("none")}</SelectItem>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="edit-subject" className="text-base">
                  {tc("subject")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-subject"
                  className="h-12 text-base"
                  {...form.register("subject")}
                />
                {form.formState.errors.subject && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.subject.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-base">{tc("description")}</Label>
                <Textarea
                  id="edit-description"
                  className="text-base min-h-[120px]"
                  rows={6}
                  {...form.register("description")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle>{tn("classification")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-base">{tc("status")}</Label>
                  <Select
                    value={form.watch("status") || "OPEN"}
                    onValueChange={(v) =>
                      form.setValue("status", v as TicketUpdateInput["status"])
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">{ts("OPEN")}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{ts("IN_PROGRESS")}</SelectItem>
                      <SelectItem value="WAITING">{ts("WAITING")}</SelectItem>
                      <SelectItem value="RESOLVED">{ts("RESOLVED")}</SelectItem>
                      <SelectItem value="BILLABLE">{ts("BILLABLE")}</SelectItem>
                      <SelectItem value="CLOSED">{ts("CLOSED")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-base">{tc("priority")}</Label>
                  <Select
                    value={form.watch("priority") || "NORMAL"}
                    onValueChange={(v) =>
                      form.setValue("priority", v as TicketUpdateInput["priority"])
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">{tp("LOW")}</SelectItem>
                      <SelectItem value="NORMAL">{tp("NORMAL")}</SelectItem>
                      <SelectItem value="HIGH">{tp("HIGH")}</SelectItem>
                      <SelectItem value="URGENT">{tp("URGENT")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-base">{tc("category")}</Label>
                  <Select
                    value={form.watch("category") || "none"}
                    onValueChange={(v) =>
                      form.setValue(
                        "category",
                        v === "none"
                          ? undefined
                          : (v as TicketUpdateInput["category"]),
                      )
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tc("none")}</SelectItem>
                      <SelectItem value="HARDWARE">{tcat("HARDWARE")}</SelectItem>
                      <SelectItem value="SOFTWARE">{tcat("SOFTWARE")}</SelectItem>
                      <SelectItem value="NETWORK">{tcat("NETWORK")}</SelectItem>
                      <SelectItem value="ACCOUNT">{tcat("ACCOUNT")}</SelectItem>
                      <SelectItem value="OTHER">{tcat("OTHER")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IT Snippet */}
          <Card>
            <CardHeader>
              <CardTitle>{tn("itSnippet")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Tasks Performed */}
              <div className="space-y-2">
                <Label htmlFor="edit-tasksPerformed" className="text-base">{t("tasksPerformed")}</Label>
                <Textarea
                  id="edit-tasksPerformed"
                  className="text-base min-h-[100px]"
                  placeholder={tn("tasksPlaceholder")}
                  rows={4}
                  {...form.register("tasksPerformed")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* PC Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit-pcName" className="text-base">{t("pcName")}</Label>
                  <Input
                    id="edit-pcName"
                    className="h-11 text-base"
                    placeholder={tn("pcNamePlaceholder")}
                    {...form.register("pcName")}
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-2">
                  <Label htmlFor="edit-serialNumber" className="text-base">{t("serialNumber")}</Label>
                  <Input
                    id="edit-serialNumber"
                    className="h-11 text-base"
                    placeholder={tn("serialPlaceholder")}
                    {...form.register("serialNumber")}
                  />
                </div>

                {/* Office License */}
                <div className="space-y-2">
                  <Label htmlFor="edit-officeLicense" className="text-base">{t("officeLicense")}</Label>
                  <Input
                    id="edit-officeLicense"
                    className="h-11 text-base"
                    placeholder={tn("licensePlaceholder")}
                    {...form.register("officeLicense")}
                  />
                </div>
              </div>

              {/* Pending Tasks */}
              <div className="space-y-2">
                <Label htmlFor="edit-pendingTasks" className="text-base">{t("pendingTasks")}</Label>
                <Textarea
                  id="edit-pendingTasks"
                  className="text-base min-h-[100px]"
                  placeholder={tn("pendingPlaceholder")}
                  rows={4}
                  {...form.register("pendingTasks")}
                />
              </div>

              {/* Equipment Taken */}
              <div className="space-y-2">
                <Label htmlFor="edit-equipmentTaken" className="text-base">{t("equipmentTaken")}</Label>
                <Textarea
                  id="edit-equipmentTaken"
                  className="text-base min-h-[80px]"
                  placeholder={tn("equipmentPlaceholder")}
                  rows={3}
                  {...form.register("equipmentTaken")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" size="lg" disabled={updateTicket.isPending}>
              {updateTicket.isPending ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
