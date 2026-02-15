"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTickets } from "@/hooks/use-tickets";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { StatusBadge, PriorityBadge } from "@/components/shared/status-badge";
import { CompanySelect } from "@/components/shared/company-select";
import { BulkActionsBar } from "@/components/tickets/bulk-actions-bar";
import { Plus, Search, Ticket, Kanban } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 20;

interface TicketRow {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
  company: { id: string; name: string; shortName: string };
  contact: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  _count: { timeEntries: number };
}

export default function TicketsPage() {
  const t = useTranslations("tickets");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const tp = useTranslations("priority");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [companyId, setCompanyId] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useTickets({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    priority: priority !== "all" ? priority : undefined,
    companyId: companyId !== "all" ? companyId : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const response = data as
    | { data: TicketRow[]; total: number; page: number; pageSize: number }
    | undefined;

  const tickets = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Link href="/tickets/board">
            <Button variant="outline">
              <Kanban className="mr-2 h-4 w-4" />
              {t("boardView")}
            </Button>
          </Link>
          <Link href="/tickets/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("newTicket")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tc("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                <SelectItem value="OPEN">{ts("OPEN")}</SelectItem>
                <SelectItem value="IN_PROGRESS">{ts("IN_PROGRESS")}</SelectItem>
                <SelectItem value="WAITING">{ts("WAITING")}</SelectItem>
                <SelectItem value="RESOLVED">{ts("RESOLVED")}</SelectItem>
                <SelectItem value="CLOSED">{ts("CLOSED")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priority}
              onValueChange={(v) => {
                setPriority(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tc("priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allPriorities")}</SelectItem>
                <SelectItem value="LOW">{tp("LOW")}</SelectItem>
                <SelectItem value="NORMAL">{tp("NORMAL")}</SelectItem>
                <SelectItem value="HIGH">{tp("HIGH")}</SelectItem>
                <SelectItem value="URGENT">{tp("URGENT")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-[200px]">
              <CompanySelect
                value={companyId}
                onValueChange={(v) => {
                  setCompanyId(v);
                  setPage(1);
                }}
                placeholder={t("allCompanies")}
                allowAll
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noTickets")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search ||
                status !== "all" ||
                priority !== "all" ||
                companyId !== "all"
                  ? t("adjustFilters")
                  : t("createFirst")}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          tickets.length > 0 &&
                          selectedIds.length === tickets.length
                        }
                        onCheckedChange={(checked) => {
                          setSelectedIds(
                            checked ? tickets.map((t) => t.id) : [],
                          );
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[70px]">{t("number")}</TableHead>
                    <TableHead>{t("subject")}</TableHead>
                    <TableHead>{t("company")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("priority")}</TableHead>
                    <TableHead>{t("assignedTo")}</TableHead>
                    <TableHead className="text-right">{t("date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(ticket.id)}
                          onCheckedChange={(checked) => {
                            setSelectedIds((prev) =>
                              checked
                                ? [...prev, ticket.id]
                                : prev.filter((id) => id !== ticket.id),
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="block font-mono text-muted-foreground"
                        >
                          #{String(ticket.ticketNumber).padStart(3, "0")}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="block font-medium hover:underline"
                        >
                          {ticket.subject}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ticket.company.shortName}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={ticket.priority} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ticket.assignedTo?.name || "\u2014"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(ticket.createdAt), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {tc("page", { current: page, total: totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      {tc("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                    >
                      {tc("next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
        onSuccess={() => setSelectedIds([])}
      />
    </div>
  );
}
