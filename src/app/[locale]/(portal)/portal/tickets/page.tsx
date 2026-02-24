"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { usePortalTickets } from "@/hooks/use-portal";
import { Plus, Ticket, Search } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  OPEN: "destructive",
  IN_PROGRESS: "default",
  WAITING: "secondary",
  RESOLVED: "outline",
  BILLABLE: "secondary",
  CLOSED: "outline",
};

export default function PortalTicketsPage() {
  const t = useTranslations("portal");
  const ts = useTranslations("status");
  const tp = useTranslations("priority");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePortalTickets({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    pageSize: 20,
  }) as {
    data:
      | {
          data: Array<{
            id: string;
            ticketNumber: number;
            subject: string;
            status: string;
            priority: string;
            category: string | null;
            createdAt: string;
            contact: { name: string } | null;
          }>;
          total: number;
          page: number;
          pageSize: number;
        }
      | undefined;
    isLoading: boolean;
  };

  const tickets = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("tickets")}</h1>
        <Link href="/portal/tickets/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            {t("newTicket")}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{t("yourTickets")}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 w-[200px] sm:w-[250px]"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v === "ALL" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t("allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("allStatuses")}</SelectItem>
                  <SelectItem value="OPEN">{ts("OPEN")}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{ts("IN_PROGRESS")}</SelectItem>
                  <SelectItem value="WAITING">{ts("WAITING")}</SelectItem>
                  <SelectItem value="RESOLVED">{ts("RESOLVED")}</SelectItem>
                  <SelectItem value="BILLABLE">{ts("BILLABLE")}</SelectItem>
                  <SelectItem value="CLOSED">{ts("CLOSED")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              {t("loading")}
            </p>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t("noTickets")}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">#</TableHead>
                    <TableHead>{t("subject")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("priority")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-sm">
                        {ticket.ticketNumber}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/portal/tickets/${ticket.id}`}
                          className="font-medium hover:underline"
                        >
                          {ticket.subject}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant[ticket.status] || "outline"}
                        >
                          {ts(
                            ticket.status as
                              | "OPEN"
                              | "IN_PROGRESS"
                              | "WAITING"
                              | "RESOLVED"
                              | "CLOSED",
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tp(
                          ticket.priority as
                            | "LOW"
                            | "NORMAL"
                            | "HIGH"
                            | "URGENT",
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(ticket.createdAt), "d MMM yyyy", {
                          locale: nl,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t("showing", {
                      from: (page - 1) * 20 + 1,
                      to: Math.min(page * 20, total),
                      total,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      {t("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      {t("next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
