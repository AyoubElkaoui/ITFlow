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
import { Badge } from "@/components/ui/badge";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Clock,
  Building2,
  User,
  Tag,
  Trash2,
  Plus,
  Play,
  Square,
  Wrench,
  CalendarDays,
  UserCircle,
  ShieldCheck,
  MessageSquare,
  ImageIcon,
  Package,
  Pencil,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  useTicketTimeLogs,
  useStartWork,
  useStopWork,
} from "@/hooks/use-ticket-time-logs";
import { EditTicketDialog } from "@/components/tickets/edit-ticket-dialog";
import { TicketTimeLogs } from "@/components/tickets/ticket-time-logs";
import { TicketMaterialEquipment } from "@/components/tickets/ticket-material-equipment";
import { TicketNotes } from "@/components/tickets/ticket-notes";
import { TicketConversation } from "@/components/tickets/ticket-conversation";
import { TicketAttachments } from "@/components/tickets/ticket-attachments";
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
  source: string;
  plannedFor: string | null;
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
  const tsrc = useTranslations("ticketSource");
  const ttoast = useTranslations("toasts");
  const { data: ticket, isLoading } = useTicket(id);
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const updateTicket = useUpdateTicket(id);
  const deleteTicket = useDeleteTicket();
  const createTimeEntry = useCreateTimeEntry();

  const { data: timeLogs } = useTicketTimeLogs(id);
  const startWork = useStartWork(id);
  const stopWork = useStopWork(id);
  const myRunningLog = (timeLogs ?? []).find(
    (l) => l.endedAt === null && l.userId === currentUserId,
  );

  const [timeHours, setTimeHours] = useState("");
  const [timeDescription, setTimeDescription] = useState("");
  const [timeDate, setTimeDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [timeBillable, setTimeBillable] = useState(true);
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("timelogs");

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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="space-y-3">
        {/* Rij 1: terug + nummer + titel */}
        <div className="flex items-start gap-3">
          <Link href="/tickets" className="shrink-0 mt-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">
                #{String(tk.ticketNumber).padStart(3, "0")}
              </span>
              <StatusBadge status={tk.status} />
              <PriorityBadge priority={tk.priority} />
              {tk.source && tk.source !== "OVERIG" && (
                <Badge
                  variant="outline"
                  className={
                    tk.source === "OPDRACHT"
                      ? "border-indigo-400 text-indigo-600 dark:text-indigo-400"
                      : tk.source === "PORTAL"
                        ? "border-amber-400 text-amber-600 dark:text-amber-400"
                        : "border-teal-400 text-teal-600 dark:text-teal-400"
                  }
                >
                  {tsrc(tk.source as "OPDRACHT" | "INBOUND" | "PORTAL")}
                </Badge>
              )}
            </div>
            <h1 className="text-lg md:text-2xl font-bold mt-1 leading-tight">{tk.subject}</h1>
          </div>
        </div>

        {/* Rij 2: acties */}
        <div className="flex items-center gap-2 flex-wrap pl-11">
          {myRunningLog ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-9"
              onClick={() => stopWork.mutate(myRunningLog.id)}
              disabled={stopWork.isPending}
            >
              <Square className="mr-1.5 h-4 w-4" />
              {t("stopWork")}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-9"
              onClick={() => startWork.mutate()}
              disabled={startWork.isPending}
            >
              <Play className="mr-1.5 h-4 w-4" />
              {t("startWork")}
            </Button>
          )}
          <Select value={tk.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[150px] h-9">
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
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" className="h-9 w-9" onClick={handleDelete}>
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent>
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
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              {t("contact")}
            </div>
            <div className="text-lg font-semibold">
              {tk.contact?.name || "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Tag className="h-4 w-4" />
              {t("category")}
            </div>
            <div className="text-lg font-semibold">
              {tk.category || "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
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
          {/* Werkzaamheden: beschrijving + IT Snippet samengevoegd */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                {t("workPerformed")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tk.description && (
                <p className="text-sm whitespace-pre-wrap">{tk.description}</p>
              )}
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
              {!tk.description && snippetFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("noDescription")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Secundaire blokken compact in tabs */}
          <Card>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Mobiel: dropdown — 5 tab-secties passen niet netjes op een
                    telefoon, dus kies je de sectie via een keuzemenu. */}
                <div className="md:hidden">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversation">{t("customerMessages")}</SelectItem>
                      <SelectItem value="timelogs">{t("workTime")}</SelectItem>
                      <SelectItem value="time">{t("timeEntries")}</SelectItem>
                      <SelectItem value="notes">{t("notes")}</SelectItem>
                      <SelectItem value="materials">{t("materialEquipment")}</SelectItem>
                      <SelectItem value="attachments">{t("attachments")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Desktop: volledige tab-balk */}
                <TabsList className="hidden md:inline-flex">
                  <TabsTrigger value="conversation">
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    {t("customerMessages")}
                  </TabsTrigger>
                  <TabsTrigger value="timelogs">
                    <Clock className="h-4 w-4 mr-1.5" />
                    {t("workTime")}
                  </TabsTrigger>
                  <TabsTrigger value="time">
                    <Clock className="h-4 w-4 mr-1.5" />
                    {t("timeEntries")}
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    <MessageSquare className="h-4 w-4 mr-1.5" />
                    {t("notes")}
                  </TabsTrigger>
                  <TabsTrigger value="materials">
                    <Package className="h-4 w-4 mr-1.5" />
                    {t("materialEquipment")}
                  </TabsTrigger>
                  <TabsTrigger value="attachments">
                    <ImageIcon className="h-4 w-4 mr-1.5" />
                    {t("attachments")}
                  </TabsTrigger>
                </TabsList>

                {/* Berichten — klant-conversatie: lezen en direct reageren.
                    Een reactie is zichtbaar voor de klant in het portaal (+ e-mail). */}
                <TabsContent value="conversation" className="mt-4">
                  <TicketConversation
                    ticketId={tk.id}
                    contactName={tk.contact?.name}
                    messagesClassName="max-h-[50vh] pr-1"
                  />
                </TabsContent>

                {/* Werk-tijd (TicketTimeLog — bron voor dagafsluiting) */}
                <TabsContent value="timelogs" className="mt-4">
                  <TicketTimeLogs ticketId={tk.id} currentUserId={currentUserId} />
                </TabsContent>

                {/* Uren (facturatie) */}
                <TabsContent value="time" className="mt-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    {t("timeAutoHint")}
                  </p>
                  {tk.timeEntries.length > 0 ? (
                    <>
                      {/* Mobiele kaartweergave */}
                      <div className="md:hidden space-y-2">
                        {tk.timeEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between rounded-lg border p-2.5">
                            <div>
                              <p className="text-xs text-muted-foreground">{format(new Date(entry.date), "dd MMM yyyy")}</p>
                              {entry.description && <p className="text-sm mt-0.5 truncate max-w-[200px]">{entry.description}</p>}
                            </div>
                            <span className="font-mono font-semibold">{Number(entry.hours).toFixed(2)}h</span>
                          </div>
                        ))}
                      </div>
                      {/* Desktop tabelweergave */}
                      <div className="hidden md:block overflow-x-auto">
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
                                <TableCell className="text-sm">{format(new Date(entry.date), "dd MMM yyyy")}</TableCell>
                                <TableCell className="text-sm">{entry.description || "—"}</TableCell>
                                <TableCell className="text-right font-mono">{Number(entry.hours).toFixed(2)}h</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("noTimeEntries")}
                    </p>
                  )}

                  {/* Quick Log Time form */}
                  <form onSubmit={handleLogTime} className="mt-4 pt-4 border-t border-border space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={timeDate}
                        onChange={(e) => setTimeDate(e.target.value)}
                      />
                      <Input
                        type="number"
                        step="0.25"
                        min="0.25"
                        placeholder={t("hours")}
                        value={timeHours}
                        onChange={(e) => setTimeHours(e.target.value)}
                      />
                    </div>
                    <Input
                      type="text"
                      placeholder={t("description")}
                      value={timeDescription}
                      onChange={(e) => setTimeDescription(e.target.value)}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id="time-billable"
                          checked={timeBillable}
                          onCheckedChange={(v) => setTimeBillable(v === true)}
                        />
                        <Label htmlFor="time-billable" className="text-sm">{tc("billable")}</Label>
                      </div>
                      <Button type="submit" size="sm" disabled={isLoggingTime || !timeHours}>
                        <Plus className="h-4 w-4 mr-1" />
                        {t("logTime")}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                {/* Notities */}
                <TabsContent value="notes" className="mt-4">
                  <TicketNotes ticketId={tk.id} />
                </TabsContent>

                {/* Materiaal & apparatuur — voorraad-verbruik + gekoppelde assets, één plek */}
                <TabsContent value="materials" className="mt-4">
                  <TicketMaterialEquipment
                    ticketId={tk.id}
                    companyId={tk.company.id}
                  />
                </TabsContent>

                {/* Bijlagen */}
                <TabsContent value="attachments" className="mt-4">
                  <TicketAttachments ticketId={tk.id} />
                </TabsContent>
              </Tabs>
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
                <span className="text-muted-foreground">{t("sla")}</span>
                <SlaIndicator
                  responseDue={tk.slaResponseDue}
                  resolveDue={tk.slaResolveDue}
                  responseMet={tk.slaResponseMet}
                  resolveMet={tk.slaResolveMet}
                />
              </div>
              {tk.plannedFor && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("plannedFor")}
                  </span>
                  <span>{format(new Date(tk.plannedFor), "dd MMM yyyy")}</span>
                </div>
              )}
              <div className="border-t border-border pt-4 flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("assignedTo")}
                </span>
                <span>{tk.assignedTo?.name || "—"}</span>
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
