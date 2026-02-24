"use client";

import { useTranslations } from "next-intl";

import { use, useState } from "react";
import { useCompany, useUpdateCompany } from "@/hooks/use-companies";
import { useTickets } from "@/hooks/use-tickets";
import { useTimeEntries } from "@/hooks/use-time-entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, PriorityBadge } from "@/components/shared/status-badge";
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
  Building2,
  Mail,
  Phone,
  Globe,
  User,
  Pencil,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { EditCompanyDialog } from "@/components/companies/edit-company-dialog";

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: company, isLoading } = useCompany(id);
  const { data: ticketsData } = useTickets({ companyId: id });
  const { data: timeData } = useTimeEntries({ companyId: id });
  const updateCompany = useUpdateCompany(id);
  const [showEdit, setShowEdit] = useState(false);
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const ttoast = useTranslations("toasts");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium">{t("notFound")}</h2>
        <Link
          href="/companies"
          className="text-sm text-muted-foreground hover:underline"
        >
          {t("backToCompanies")}
        </Link>
      </div>
    );
  }

  const c = company as {
    id: string;
    name: string;
    shortName: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    contactPerson: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    hourlyRate: string | null;
    notes: string | null;
    isActive: boolean;
    contacts: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      function: string | null;
      isPrimary: boolean;
    }[];
    _count: {
      tickets: number;
      timeEntries: number;
      assets: number;
      contacts: number;
    };
  };

  const tickets = ((ticketsData as { data: unknown[] })?.data || []) as {
    id: string;
    ticketNumber: number;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
  }[];

  const timeEntries = ((timeData as { data: unknown[] })?.data || []) as {
    id: string;
    date: string;
    hours: string;
    description: string | null;
    billable: boolean;
    ticket: { ticketNumber: number; subject: string } | null;
  }[];

  const totalHours = timeEntries.reduce((sum, e) => sum + Number(e.hours), 0);

  async function toggleActive() {
    try {
      await updateCompany.mutateAsync({ isActive: !c.isActive });
      toast.success(
        c.isActive ? ttoast("companyDeactivated") : ttoast("companyActivated"),
      );
    } catch {
      toast.error(ttoast("failed", { action: "update", entity: "company" }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/companies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{c.shortName}</h1>
            <Badge variant={c.isActive ? "default" : "secondary"}>
              {c.isActive ? tc("active") : tc("inactive")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{c.name}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setShowEdit(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={toggleActive}>
          {c.isActive ? t("deactivate") : t("activate")}
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{c._count.tickets}</div>
            <p className="text-sm text-muted-foreground">{t("totalTickets")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
            <p className="text-sm text-muted-foreground">{t("totalHours")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{c._count.contacts}</div>
            <p className="text-sm text-muted-foreground">{t("contacts")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t("details")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {c.address && (
              <div className="flex gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{c.address}</span>
              </div>
            )}
            {c.email && (
              <div className="flex gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{c.email}</span>
              </div>
            )}
            {c.phone && (
              <div className="flex gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{c.phone}</span>
              </div>
            )}
            {c.website && (
              <div className="flex gap-3">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{c.website}</span>
              </div>
            )}
            {c.contactPerson && (
              <div className="flex gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <div>{c.contactPerson}</div>
                  {c.contactEmail && (
                    <div className="text-muted-foreground">
                      {c.contactEmail}
                    </div>
                  )}
                  {c.contactPhone && (
                    <div className="text-muted-foreground">
                      {c.contactPhone}
                    </div>
                  )}
                </div>
              </div>
            )}
            {c.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {c.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="tickets">
            <CardHeader>
              <TabsList>
                <TabsTrigger value="tickets">
                  {`${t("tickets")} (${tickets.length})`}
                </TabsTrigger>
                <TabsTrigger value="time">
                  {`${t("hours")} (${timeEntries.length})`}
                </TabsTrigger>
                <TabsTrigger value="contacts">
                  {`${t("contacts")} (${c.contacts.length})`}
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="tickets" className="mt-0">
                {tickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("noTickets")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{tc("subject")}</TableHead>
                        <TableHead>{tc("status")}</TableHead>
                        <TableHead>{tc("priority")}</TableHead>
                        <TableHead>{tc("date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-mono text-muted-foreground">
                            #{String(ticket.ticketNumber).padStart(3, "0")}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/tickets/${ticket.id}`}
                              className="hover:underline font-medium"
                            >
                              {ticket.subject}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.status} />
                          </TableCell>
                          <TableCell>
                            <PriorityBadge priority={ticket.priority} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(ticket.createdAt), "dd MMM yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="time" className="mt-0">
                {timeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("noTimeEntries")}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tc("date")}</TableHead>
                        <TableHead>{tc("description")}</TableHead>
                        <TableHead>{tc("subject")}</TableHead>
                        <TableHead className="text-right">
                          {tc("hours")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">
                            {format(new Date(entry.date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.description || "\u2014"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.ticket
                              ? `#${String(entry.ticket.ticketNumber).padStart(3, "0")}`
                              : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {Number(entry.hours).toFixed(2)}h
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="contacts" className="mt-0">
                {c.contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t("noContacts")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {c.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {contact.name}
                            </span>
                            {contact.isPrimary && (
                              <Badge variant="secondary" className="text-xs">
                                {tc("primary")}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[contact.function, contact.email, contact.phone]
                              .filter(Boolean)
                              .join(" \u00B7 ")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <EditCompanyDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        company={c}
      />
    </div>
  );
}
