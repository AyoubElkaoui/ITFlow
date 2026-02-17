"use client";

import { useTranslations } from "next-intl";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Clock, Trash2 } from "lucide-react";

import {
  useTimeEntries,
  useCreateTimeEntry,
  useDeleteTimeEntry,
} from "@/hooks/use-time-entries";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanySelect } from "@/components/shared/company-select";
import { UserSelect } from "@/components/shared/user-select";

const PAGE_SIZE = 20;

interface TimeEntry {
  id: string;
  date: string;
  hours: string;
  description: string | null;
  billable: boolean;
  company: {
    id: string;
    name: string;
    shortName: string;
    hourlyRate: string | null;
  };
  ticket: { id: string; ticketNumber: number; subject: string } | null;
  user: { id: string; name: string };
}

interface TimeEntriesResponse {
  data: TimeEntry[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    totalHours: number;
    billableHours: number;
    totalAmount: number;
    count: number;
  };
}

export default function TimePage() {
  const t = useTranslations("time");
  const tc = useTranslations("common");
  const [companyId, setCompanyId] = useState("all");
  const [userId, setUserId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, error } = useTimeEntries({
    companyId: companyId !== "all" ? companyId : undefined,
    userId: userId !== "all" ? userId : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const response = data as TimeEntriesResponse | undefined;
  const entries = response?.data || [];
  const total = response?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const createTimeEntry = useCreateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry();

  // Summary from server (calculated over ALL matching entries, not just current page)
  const summary = response?.summary || {
    totalHours: 0,
    billableHours: 0,
    totalAmount: 0,
    count: 0,
  };

  // Multi-row log hours state
  interface LogRow {
    companyId: string;
    hours: number;
    description: string;
    billable: boolean;
  }

  const emptyRow = (): LogRow => ({
    companyId: "",
    hours: 0,
    description: "",
    billable: true,
  });

  const [logDate, setLogDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [logRows, setLogRows] = useState<LogRow[]>([emptyRow()]);
  const [isSaving, setIsSaving] = useState(false);

  const resetDialog = useCallback(() => {
    setLogDate(format(new Date(), "yyyy-MM-dd"));
    setLogRows([emptyRow()]);
  }, []);

  function updateRow(index: number, updates: Partial<LogRow>) {
    setLogRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row)),
    );
  }

  function removeRow(index: number) {
    setLogRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  async function handleSaveAll() {
    const validRows = logRows.filter((r) => r.companyId && r.hours > 0);
    if (validRows.length === 0) {
      toast.error(t("fillAtLeastOneRow"));
      return;
    }
    setIsSaving(true);
    try {
      for (const row of validRows) {
        await createTimeEntry.mutateAsync({
          companyId: row.companyId,
          date: new Date(logDate),
          hours: row.hours,
          description: row.description || undefined,
          billable: row.billable,
        });
      }
      toast(t("entriesLogged", { count: validRows.length }));
      setDialogOpen(false);
      resetDialog();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create time entries",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("deleteConfirm"))) {
      return;
    }
    try {
      await deleteTimeEntry.mutateAsync(id);
      toast("Time entry deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete time entry",
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("logHours")}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-10 w-10 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground">{t("failedToLoad")}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("totalHours")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalHours.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("billableHours")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.billableHours.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("entries")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
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
            <div className="w-[200px]">
              <UserSelect
                value={userId}
                onValueChange={(v) => {
                  setUserId(v);
                  setPage(1);
                }}
                placeholder={t("allEmployees")}
                allowAll
              />
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="from-date"
                className="text-sm text-muted-foreground whitespace-nowrap"
              >
                {t("from")}
              </Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="to-date"
                className="text-sm text-muted-foreground whitespace-nowrap"
              >
                {t("to")}
              </Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-[160px]"
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
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noEntries")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {companyId !== "all" || userId !== "all" || fromDate || toDate
                  ? t("adjustFilters")
                  : t("logFirst")}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("employee")}</TableHead>
                    <TableHead>{t("company")}</TableHead>
                    <TableHead>{t("ticket")}</TableHead>
                    <TableHead>{t("description")}</TableHead>
                    <TableHead className="text-right">{t("hours")}</TableHead>
                    <TableHead>{t("billable")}</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const hours = Number(entry.hours);

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(entry.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>{entry.user.name}</TableCell>
                        <TableCell>{entry.company.shortName}</TableCell>
                        <TableCell>
                          {entry.ticket
                            ? `#${String(entry.ticket.ticketNumber).padStart(3, "0")}`
                            : "\u2014"}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {entry.description || "\u2014"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {hours.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={entry.billable ? "default" : "secondary"}
                          >
                            {entry.billable ? tc("yes") : tc("no")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleteTimeEntry.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      {/* Create Time Entry Dialog (multi-row) */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("logHours")}</DialogTitle>
            <DialogDescription>{t("logDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Shared date */}
            <div className="space-y-2">
              <Label htmlFor="entry-date">{tc("date")}</Label>
              <Input
                id="entry-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-[180px]"
              />
            </div>

            {/* Rows */}
            <div className="space-y-3">
              {logRows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_1fr_auto_auto] items-center gap-2 rounded-lg border p-3"
                >
                  {/* Company */}
                  <CompanySelect
                    value={row.companyId}
                    onValueChange={(v) => updateRow(i, { companyId: v })}
                    placeholder={tc("selectCompany")}
                  />

                  {/* Hours */}
                  <Input
                    type="number"
                    step={0.25}
                    min={0}
                    max={24}
                    value={row.hours || ""}
                    onChange={(e) =>
                      updateRow(i, { hours: parseFloat(e.target.value) || 0 })
                    }
                    placeholder={tc("hours")}
                  />

                  {/* Description */}
                  <Input
                    value={row.description}
                    onChange={(e) =>
                      updateRow(i, { description: e.target.value })
                    }
                    placeholder={t("whatDidYouWorkOn")}
                  />

                  {/* Billable */}
                  <Checkbox
                    checked={row.billable}
                    onCheckedChange={(v) =>
                      updateRow(i, { billable: v === true })
                    }
                  />

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeRow(i)}
                    disabled={logRows.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add row */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLogRows((prev) => [...prev, emptyRow()])}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("addRow")}
            </Button>

            <DialogFooter>
              <Button onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? tc("saving") : t("saveAll")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
