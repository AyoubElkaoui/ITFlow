"use client";

import { useTranslations } from "next-intl";

import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Clock, Search, Trash2 } from "lucide-react";

import {
  useTimeEntries,
  useCreateTimeEntry,
  useDeleteTimeEntry,
} from "@/hooks/use-time-entries";
import {
  timeEntryCreateSchema,
  type TimeEntryCreateInput,
} from "@/lib/validations";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  // Summary calculations
  const summary = useMemo(() => {
    let totalHours = 0;
    let billableHours = 0;
    let totalAmount = 0;

    for (const entry of entries) {
      const hours = Number(entry.hours);
      totalHours += hours;
      if (entry.billable) {
        billableHours += hours;
        const rate = entry.company.hourlyRate
          ? Number(entry.company.hourlyRate)
          : 0;
        totalAmount += hours * rate;
      }
    }

    return {
      totalHours,
      billableHours,
      totalAmount,
      count: entries.length,
    };
  }, [entries]);

  // Form setup
  const form = useForm<TimeEntryCreateInput>({
    resolver: typedResolver(timeEntryCreateSchema),
    defaultValues: {
      companyId: "",
      ticketId: undefined,
      date: new Date(),
      hours: 0,
      description: "",
      billable: true,
    },
  });

  async function onSubmit(values: TimeEntryCreateInput) {
    try {
      await createTimeEntry.mutateAsync(values);
      toast("Time entry logged");
      setDialogOpen(false);
      form.reset({
        companyId: "",
        ticketId: undefined,
        date: new Date(),
        hours: 0,
        description: "",
        billable: true,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create time entry",
      );
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              {t("totalAmount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en", {
                style: "currency",
                currency: "EUR",
              }).format(summary.totalAmount)}
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
                    <TableHead className="text-right">{t("amount")}</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const hours = Number(entry.hours);
                    const rate = entry.company.hourlyRate
                      ? Number(entry.company.hourlyRate)
                      : 0;
                    const amount = entry.billable ? hours * rate : 0;

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
                        <TableCell className="text-right font-mono">
                          {new Intl.NumberFormat("en", {
                            style: "currency",
                            currency: "EUR",
                          }).format(amount)}
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

      {/* Create Time Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("logHours")}</DialogTitle>
            <DialogDescription>{t("logDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Company */}
            <div className="space-y-2">
              <Label>{tc("company")}</Label>
              <Controller
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <CompanySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={tc("selectCompany")}
                  />
                )}
              />
              {form.formState.errors.companyId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.companyId.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="entry-date">{tc("date")}</Label>
              <Input
                id="entry-date"
                type="date"
                value={
                  form.watch("date")
                    ? format(form.watch("date"), "yyyy-MM-dd")
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  form.setValue("date", val ? new Date(val) : new Date(), {
                    shouldValidate: true,
                  });
                }}
              />
              {form.formState.errors.date && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <Label htmlFor="entry-hours">{tc("hours")}</Label>
              <Input
                id="entry-hours"
                type="number"
                step={0.25}
                min={0}
                max={24}
                {...form.register("hours", { valueAsNumber: true })}
              />
              {form.formState.errors.hours && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.hours.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="entry-description">{tc("description")}</Label>
              <Textarea
                id="entry-description"
                placeholder={t("whatDidYouWorkOn")}
                rows={3}
                {...form.register("description")}
              />
            </div>

            {/* Billable */}
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="billable"
                render={({ field }) => (
                  <Checkbox
                    id="entry-billable"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="entry-billable" className="cursor-pointer">
                {tc("billable")}
              </Label>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createTimeEntry.isPending}>
                {createTimeEntry.isPending ? tc("saving") : t("logHours")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
