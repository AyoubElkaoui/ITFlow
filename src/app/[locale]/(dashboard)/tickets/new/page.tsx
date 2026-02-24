"use client";

import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import { ticketCreateSchema, type TicketCreateInput } from "@/lib/validations";
import { useCreateTicket } from "@/hooks/use-tickets";
import { useContacts } from "@/hooks/use-contacts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CompanySelect } from "@/components/shared/company-select";
import {
  TemplateSelect,
  type TemplateData,
} from "@/components/tickets/template-select";
import { QuickCreateCompanyDialog } from "@/components/tickets/quick-create-company-dialog";
import { QuickCreateContactDialog } from "@/components/tickets/quick-create-contact-dialog";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function NewTicketPage() {
  const router = useRouter();
  const t = useTranslations("newTicket");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tp = useTranslations("priority");
  const tcat = useTranslations("category");
  const tt = useTranslations("tickets");
  const ttoast = useTranslations("toasts");
  const createTicket = useCreateTicket();

  const form = useForm<TicketCreateInput>({
    resolver: typedResolver(ticketCreateSchema),
    defaultValues: {
      companyId: "",
      contactId: undefined,
      subject: "",
      description: "",
      status: "OPEN",
      priority: "NORMAL",
      category: undefined,
      assignedToId: undefined,
      tasksPerformed: "",
      pcName: "",
      serialNumber: "",
      officeLicense: "",
      pendingTasks: "",
      equipmentTaken: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const selectedCompanyId = watch("companyId");

  const { data: contacts } = useContacts(selectedCompanyId || undefined);

  const contactList = (contacts as { id: string; name: string }[]) || [];

  function handleTemplateSelect(template: TemplateData | null) {
    if (!template) return;
    if (template.subject) setValue("subject", template.subject);
    if (template.body) setValue("description", template.body);
    if (template.priority)
      setValue("priority", template.priority as TicketCreateInput["priority"]);
    if (template.category)
      setValue("category", template.category as TicketCreateInput["category"]);
    if (template.tasksPerformed)
      setValue("tasksPerformed", template.tasksPerformed);
    if (template.pcName) setValue("pcName", template.pcName);
    if (template.serialNumber) setValue("serialNumber", template.serialNumber);
    if (template.officeLicense)
      setValue("officeLicense", template.officeLicense);
    if (template.pendingTasks) setValue("pendingTasks", template.pendingTasks);
    if (template.equipmentTaken)
      setValue("equipmentTaken", template.equipmentTaken);
    toast.success(ttoast("templateApplied"));
  }

  async function onSubmit(data: TicketCreateInput) {
    try {
      await createTicket.mutateAsync(data);
      toast.success(ttoast("created", { entity: "Ticket" }));
      router.push("/tickets");
    } catch {
      toast.error(ttoast("failed", { action: "create", entity: "ticket" }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tickets">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>
        <div className="w-[220px]">
          <TemplateSelect onSelect={handleTemplateSelect} />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("basicInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company */}
              <div className="space-y-2">
                <Label htmlFor="companyId">
                  {tc("company")} <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <CompanySelect
                      value={selectedCompanyId}
                      onValueChange={(value) => {
                        setValue("companyId", value, { shouldValidate: true });
                        setValue("contactId", undefined);
                      }}
                    />
                  </div>
                  <QuickCreateCompanyDialog
                    onCreated={(company) => {
                      setValue("companyId", company.id, {
                        shouldValidate: true,
                      });
                      setValue("contactId", undefined);
                    }}
                  />
                </div>
                {errors.companyId && (
                  <p className="text-sm text-destructive">
                    {errors.companyId.message}
                  </p>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-2">
                <Label htmlFor="contactId">{tt("contact")}</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={watch("contactId") || ""}
                      onValueChange={(value) =>
                        setValue("contactId", value || undefined)
                      }
                      disabled={!selectedCompanyId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectContact")} />
                      </SelectTrigger>
                      <SelectContent>
                        {contactList.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <QuickCreateContactDialog
                    companyId={selectedCompanyId || ""}
                    onCreated={(contact) => {
                      setValue("contactId", contact.id);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                {tc("subject")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                placeholder={t("subjectPlaceholder")}
                {...register("subject")}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">
                  {errors.subject.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Textarea
                id="description"
                placeholder={t("descriptionPlaceholder")}
                rows={4}
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle>{t("classification")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">{tc("priority")}</Label>
                <Select
                  value={watch("priority")}
                  onValueChange={(value) =>
                    setValue("priority", value as TicketCreateInput["priority"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc("selectPriority")} />
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
                <Label htmlFor="category">{tc("category")}</Label>
                <Select
                  value={watch("category") || ""}
                  onValueChange={(value) =>
                    setValue("category", value as TicketCreateInput["category"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HARDWARE">{tcat("HARDWARE")}</SelectItem>
                    <SelectItem value="SOFTWARE">{tcat("SOFTWARE")}</SelectItem>
                    <SelectItem value="NETWORK">{tcat("NETWORK")}</SelectItem>
                    <SelectItem value="ACCOUNT">{tcat("ACCOUNT")}</SelectItem>
                    <SelectItem value="OTHER">{tcat("OTHER")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">{tc("status")}</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) =>
                    setValue("status", value as TicketCreateInput["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tc("selectStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">{ts("OPEN")}</SelectItem>
                    <SelectItem value="IN_PROGRESS">
                      {ts("IN_PROGRESS")}
                    </SelectItem>
                    <SelectItem value="WAITING">{ts("WAITING")}</SelectItem>
                    <SelectItem value="RESOLVED">{ts("RESOLVED")}</SelectItem>
                    <SelectItem value="BILLABLE">{ts("BILLABLE")}</SelectItem>
                    <SelectItem value="CLOSED">{ts("CLOSED")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IT Snippet */}
        <Card>
          <CardHeader>
            <CardTitle>{t("itSnippet")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tasks Performed */}
            <div className="space-y-2">
              <Label htmlFor="tasksPerformed">{tt("tasksPerformed")}</Label>
              <Textarea
                id="tasksPerformed"
                placeholder={t("tasksPlaceholder")}
                rows={3}
                {...register("tasksPerformed")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PC Name */}
              <div className="space-y-2">
                <Label htmlFor="pcName">{tt("pcName")}</Label>
                <Input
                  id="pcName"
                  placeholder={t("pcNamePlaceholder")}
                  {...register("pcName")}
                />
              </div>

              {/* Serial Number */}
              <div className="space-y-2">
                <Label htmlFor="serialNumber">{tt("serialNumber")}</Label>
                <Input
                  id="serialNumber"
                  placeholder={t("serialPlaceholder")}
                  {...register("serialNumber")}
                />
              </div>

              {/* Office License */}
              <div className="space-y-2">
                <Label htmlFor="officeLicense">{tt("officeLicense")}</Label>
                <Input
                  id="officeLicense"
                  placeholder={t("licensePlaceholder")}
                  {...register("officeLicense")}
                />
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="space-y-2">
              <Label htmlFor="pendingTasks">{tt("pendingTasks")}</Label>
              <Textarea
                id="pendingTasks"
                placeholder={t("pendingPlaceholder")}
                rows={3}
                {...register("pendingTasks")}
              />
            </div>

            {/* Equipment Taken */}
            <div className="space-y-2">
              <Label htmlFor="equipmentTaken">{tt("equipmentTaken")}</Label>
              <Input
                id="equipmentTaken"
                placeholder={t("equipmentPlaceholder")}
                {...register("equipmentTaken")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/tickets">
            <Button type="button" variant="outline">
              {tc("cancel")}
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tc("creating") : t("createTicket")}
          </Button>
        </div>
      </form>
    </div>
  );
}
