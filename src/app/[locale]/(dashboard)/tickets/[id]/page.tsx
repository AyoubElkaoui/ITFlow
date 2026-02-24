"use client";

import { useTranslations } from "next-intl";

import { use, useState } from "react";
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
} from "@/hooks/use-tickets";
import { useCreateTimeEntry } from "@/hooks/use-time-entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge, PriorityBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Clock,
  Building2,
  User,
  Tag,
  Trash2,
  Plus,
  FileText,
  Wrench,
  CalendarDays,
  UserCircle,
  ShieldCheck,
  MessageSquare,
  Link2,
  Pencil,
} from "lucide-react";
import { EditTicketDialog } from "@/components/tickets/edit-ticket-dialog";
import { TicketNotes } from "@/components/tickets/ticket-notes";
import { TicketAssets } from "@/components/tickets/ticket-assets";
import { SlaIndicator } from "@/components/tickets/sla-indicator";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

interface Ticket {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  tasksPerformed: string | null;
  pcName: string | null;
  serialNumber: string | null;
  officeLicense: string | null;
  pendingTasks: string | null;
  equipmentTaken: string | null;
  slaResponseDue: string | null;
  slaResolveDue: string | null;
  slaResponseMet: boolean | null;
  slaResolveMet: boolean | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  company: { id: string; name: string; shortName: string };
  contact: { id: string; name: string; email: string | null } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string };
  timeEntries: {
    id: string;
    date: string;
    hours: string;
    description: string | null;
    user: { id: string; name: string };
  }[];
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations("tickets");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const ttoast = useTranslations("toasts");
  const { data: ticket, isLoading } = useTicket(id);
  const updateTicket = useUpdateTicket(id);
  const deleteTicket = useDeleteTicket();
  const createTimeEntry = useCreateTimeEntry();

  const [timeHours, setTimeHours] = useState("");
  const [timeDescription, setTimeDescription] = useState("");
  const [timeDate, setTimeDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [timeBillable, setTimeBillable] = useState(true);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium">{t("notFound")}</h2>
        <Link
          href="/tickets"
          className="text-sm text-muted-foreground hover:underline"
        >
          {t("backToTickets")}
        </Link>
      </div>
    );
  }

  const tk = ticket as Ticket;

  const totalHours = tk.timeEntries.reduce(
    (sum, e) => sum + Number(e.hours),
    0,
  );

  async function handleStatusChange(newStatus: string) {
    try {
      await updateTicket.mutateAsync({
        status: newStatus as
          | "OPEN"
          | "IN_PROGRESS"
          | "WAITING"
          | "RESOLVED"
          | "CLOSED"
          | "BILLABLE",
      });
      toast.success(
        ttoast("statusUpdated", {
          status: ts(
            newStatus as
              | "OPEN"
              | "IN_PROGRESS"
              | "WAITING"
              | "RESOLVED"
              | "CLOSED"
              | "BILLABLE",
          ),
        }),
      );
    } catch {
      toast.error(ttoast("failed", { action: "update", entity: "status" }));
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      t("ticketDeleteConfirm", {
        number: String(tk.ticketNumber).padStart(3, "0"),
        subject: tk.subject,
      }),
    );
    if (!confirmed) return;

    try {
      await deleteTicket.mutateAsync(tk.id);
      toast.success(ttoast("deleted", { entity: "Ticket" }));
      router.push("/tickets");
    } catch {
      toast.error(ttoast("failed", { action: "delete", entity: "ticket" }));
    }
  }

  async function handleLogTime(e: React.FormEvent) {
    e.preventDefault();
    if (!timeHours || Number(timeHours) <= 0) return;

    setIsLoggingTime(true);
    try {
      await createTimeEntry.mutateAsync({
        ticketId: tk.id,
        companyId: tk.company.id,
        date: new Date(timeDate),
        hours: Number(timeHours),
        description: timeDescription || undefined,
        billable: timeBillable,
      });
      toast.success(ttoast("created", { entity: "Time entry" }));
      setTimeHours("");
      setTimeDescription("");
    } catch {
      toast.error(ttoast("failed", { action: "log", entity: "time entry" }));
    } finally {
      setIsLoggingTime(false);
    }
  }

  const snippetFields = [
    { label: t("tasksPerformed"), value: tk.tasksPerformed },
    { label: t("pcName"), value: tk.pcName },
    { label: t("serialNumber"), value: tk.serialNumber },
    { label: t("officeLicense"), value: tk.officeLicense },
    { label: t("pendingTasks"), value: tk.pendingTasks },
    { label: t("equipmentTaken"), value: tk.equipmentTaken },
  ].filter((f) => f.value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-muted-foreground">
              #{String(tk.ticketNumber).padStart(3, "0")}
            </span>
            <h1 className="text-2xl font-bold">{tk.subject}</h1>
            <StatusBadge status={tk.status} />
            <PriorityBadge priority={tk.priority} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tk.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("changeStatus")} />
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <EditTicketDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ticket={tk}
      />

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              {t("company")}
            </div>
            <Link
              href={`/companies/${tk.company.id}`}
              className="text-lg font-semibold hover:underline"
            >
              {tk.company.shortName}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              {t("contact")}
            </div>
            <div className="text-lg font-semibold">
              {tk.contact?.name || "\u2014"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Tag className="h-4 w-4" />
              {t("category")}
            </div>
            <div className="text-lg font-semibold">
              {tk.category || "\u2014"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              {t("timeLogged")}
            </div>
            <div className="text-lg font-semibold">
              {totalHours.toFixed(2)}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t("description")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tk.description ? (
                <p className="text-sm whitespace-pre-wrap">{tk.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("noDescription")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* IT Snippet */}
          {snippetFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  {t("itSnippet")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {snippetFields.map((field) => (
                    <div key={field.label}>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {field.label}
                      </dt>
                      <dd className="text-sm mt-0.5 whitespace-pre-wrap">
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t("notes")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TicketNotes ticketId={tk.id} />
            </CardContent>
          </Card>

          {/* Linked Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                {t("linkedAssets")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TicketAssets ticketId={tk.id} companyId={tk.company.id} />
            </CardContent>
          </Card>

          {/* Time Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("timeEntries")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tk.timeEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("description")}</TableHead>
                      <TableHead className="text-right">{t("hours")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tk.timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {format(new Date(entry.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.description || "\u2014"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(entry.hours).toFixed(2)}h
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("noTimeEntries")}
                </p>
              )}

              {/* Quick Log Time form */}
              <form
                onSubmit={handleLogTime}
                className="mt-4 pt-4 border-t border-border space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={timeDate}
                    onChange={(e) => setTimeDate(e.target.value)}
                    className="w-[150px]"
                  />
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    placeholder={t("hours")}
                    value={timeHours}
                    onChange={(e) => setTimeHours(e.target.value)}
                    className="w-24"
                  />
                  <Input
                    type="text"
                    placeholder={t("description")}
                    value={timeDescription}
                    onChange={(e) => setTimeDescription(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id="time-billable"
                      checked={timeBillable}
                      onCheckedChange={(v) => setTimeBillable(v === true)}
                    />
                    <Label htmlFor="time-billable" className="text-sm whitespace-nowrap">
                      {tc("billable")}
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoggingTime || !timeHours}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("logTime")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("status")}</span>
                <StatusBadge status={tk.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("priority")}</span>
                <PriorityBadge priority={tk.priority} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("category")}</span>
                <span>{tk.category || "\u2014"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("sla")}</span>
                <SlaIndicator
                  responseDue={tk.slaResponseDue}
                  resolveDue={tk.slaResolveDue}
                  responseMet={tk.slaResponseMet}
                  resolveMet={tk.slaResolveMet}
                />
              </div>
              <div className="border-t border-border pt-4 flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("assignedTo")}
                </span>
                <span>{tk.assignedTo?.name || "\u2014"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <UserCircle className="h-3.5 w-3.5" />
                  {t("createdBy")}
                </span>
                <span>{tk.createdBy.name}</span>
              </div>
              <div className="border-t border-border pt-4 flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t("created")}
                </span>
                <span>
                  {format(new Date(tk.createdAt), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("updated")}</span>
                <span>
                  {format(new Date(tk.updatedAt), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
              {tk.resolvedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("resolved")}</span>
                  <span>
                    {format(new Date(tk.resolvedAt), "dd MMM yyyy, HH:mm")}
                  </span>
                </div>
              )}
              {tk.closedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("closed")}</span>
                  <span>
                    {format(new Date(tk.closedAt), "dd MMM yyyy, HH:mm")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
