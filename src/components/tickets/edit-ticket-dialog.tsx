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
      assignedToId: ticket.assignedTo?.id ?? undefined,
      tasksPerformed: ticket.tasksPerformed ?? "",
      pcName: ticket.pcName ?? "",
      serialNumber: ticket.serialNumber ?? "",
      officeLicense: ticket.officeLicense ?? "",
      pendingTasks: ticket.pendingTasks ?? "",
      equipmentTaken: ticket.equipmentTaken ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      subject: ticket.subject,
      description: ticket.description ?? "",
      status: ticket.status as TicketUpdateInput["status"],
      priority: ticket.priority as TicketUpdateInput["priority"],
      category: (ticket.category as TicketUpdateInput["category"]) ?? undefined,
      companyId: ticket.company.id,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editTicket")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">{tn("basicInfo")}</h3>

            <div className="space-y-2">
              <Label htmlFor="subject">{tc("subject")} *</Label>
              <Input id="subject" {...form.register("subject")} />
              {form.formState.errors.subject && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.subject.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Textarea
                id="description"
                rows={4}
                {...form.register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tc("company")} *</Label>
                <Select
                  value={form.watch("companyId") || ""}
                  onValueChange={(v) => form.setValue("companyId", v)}
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>{t("assignedTo")}</Label>
                <Select
                  value={form.watch("assignedToId") || "none"}
                  onValueChange={(v) =>
                    form.setValue("assignedToId", v === "none" ? undefined : v)
                  }
                >
                  <SelectTrigger>
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
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">{tn("classification")}</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{tc("status")}</Label>
                <Select
                  value={form.watch("status") || "OPEN"}
                  onValueChange={(v) =>
                    form.setValue("status", v as TicketUpdateInput["status"])
                  }
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>{tc("priority")}</Label>
                <Select
                  value={form.watch("priority") || "NORMAL"}
                  onValueChange={(v) =>
                    form.setValue("priority", v as TicketUpdateInput["priority"])
                  }
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>{tc("category")}</Label>
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
                  <SelectTrigger>
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
          </div>

          {/* IT Snippet */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">{tn("itSnippet")}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pcName">{t("pcName")}</Label>
                <Input
                  id="pcName"
                  placeholder={tn("pcNamePlaceholder")}
                  {...form.register("pcName")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">{t("serialNumber")}</Label>
                <Input
                  id="serialNumber"
                  placeholder={tn("serialPlaceholder")}
                  {...form.register("serialNumber")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="officeLicense">{t("officeLicense")}</Label>
              <Input
                id="officeLicense"
                placeholder={tn("licensePlaceholder")}
                {...form.register("officeLicense")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tasksPerformed">{t("tasksPerformed")}</Label>
              <Textarea
                id="tasksPerformed"
                rows={3}
                placeholder={tn("tasksPlaceholder")}
                {...form.register("tasksPerformed")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pendingTasks">{t("pendingTasks")}</Label>
              <Textarea
                id="pendingTasks"
                rows={2}
                placeholder={tn("pendingPlaceholder")}
                {...form.register("pendingTasks")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipmentTaken">{t("equipmentTaken")}</Label>
              <Textarea
                id="equipmentTaken"
                rows={2}
                placeholder={tn("equipmentPlaceholder")}
                {...form.register("equipmentTaken")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={updateTicket.isPending}>
              {updateTicket.isPending ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
