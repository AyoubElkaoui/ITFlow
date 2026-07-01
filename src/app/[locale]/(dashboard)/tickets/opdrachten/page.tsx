"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { format, isBefore, startOfDay } from "date-fns";
import { ClipboardList, List, Kanban, CalendarClock } from "lucide-react";

import { useOpdrachten } from "@/hooks/use-tickets";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserSelect } from "@/components/shared/user-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface OpdrachtTicket {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  plannedFor: string | null;
  company: { id: string; shortName: string; name: string };
  assignedTo: { id: string; name: string } | null;
}

export default function OpdrachtenPage() {
  const t = useTranslations("tickets");
  const [assignee, setAssignee] = useState("all");

  const { data, isLoading } = useOpdrachten(
    assignee !== "all" ? assignee : undefined,
  );
  const tickets = (data as OpdrachtTicket[] | undefined) || [];
  const today = startOfDay(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardList className="h-6 w-6" />
            {t("opdrachten")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("myAssignments")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tickets/board">
            <Button variant="outline" size="sm">
              <Kanban className="mr-2 h-4 w-4" />
              {t("boardView")}
            </Button>
          </Link>
          <Link href="/tickets">
            <Button variant="outline" size="sm">
              <List className="mr-2 h-4 w-4" />
              {t("listView")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter + tabel */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-[220px]">
              <UserSelect
                value={assignee}
                onValueChange={setAssignee}
                placeholder={t("allAssignees")}
                allowAll
              />
            </div>
            <span className="ml-auto text-sm text-muted-foreground">
              {tickets.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noTickets")}</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">{t("number")}</TableHead>
                    <TableHead>{t("subject")}</TableHead>
                    <TableHead>{t("company")}</TableHead>
                    <TableHead>{t("plannedFor")}</TableHead>
                    <TableHead>{t("assignedTo")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((tk) => {
                    const planned = tk.plannedFor ? new Date(tk.plannedFor) : null;
                    const overdue = planned ? isBefore(planned, today) : false;
                    return (
                      <TableRow key={tk.id}>
                        <TableCell>
                          <Link
                            href={`/tickets/${tk.id}`}
                            className="block font-mono text-muted-foreground"
                          >
                            #{String(tk.ticketNumber).padStart(3, "0")}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/tickets/${tk.id}`}
                            className="block font-medium hover:underline"
                          >
                            {tk.subject}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tk.company.shortName}
                        </TableCell>
                        <TableCell>
                          {planned ? (
                            <span
                              className={cn(
                                "text-sm tabular-nums",
                                overdue && "font-medium text-red-600",
                              )}
                            >
                              {format(planned, "dd MMM yyyy")}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              {t("noPlanned")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tk.assignedTo?.name || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={tk.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
