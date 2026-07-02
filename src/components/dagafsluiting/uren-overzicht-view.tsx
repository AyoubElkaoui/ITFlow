"use client";

import { useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Copy,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import {
  useWorkDayOverview,
  type OverviewPeriod,
  type OverviewClient,
  type OverviewDay,
} from "@/hooks/use-workday";
import { weekdayColumns, ymd } from "@/lib/workday-overview";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

function codeOf(c: OverviewClient["company"]): string {
  return c.clockwiseCode?.trim() || c.shortName;
}

// "YYYY-MM-DD" -> Date op UTC-middernacht (zoals opgeslagen).
function asDate(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}

// Toon uren zonder onnodige decimalen (1, 7.5, 5.25).
function fmtHours(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function UrenOverzichtView() {
  const t = useTranslations("urenOverzicht");
  const tc = useTranslations("common");

  const [period, setPeriod] = useState<OverviewPeriod>("month");
  const [anchor, setAnchor] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useWorkDayOverview(period, anchor);

  const daysByDate = useMemo(() => {
    const map: Record<string, OverviewDay> = {};
    for (const d of data?.days ?? []) map[d.date] = d;
    return map;
  }, [data]);

  const weekCols = useMemo(
    () => (period === "week" ? weekdayColumns(asDate(anchor)) : []),
    [period, anchor],
  );

  function shift(delta: number) {
    const d = asDate(anchor);
    if (period === "month") d.setUTCMonth(d.getUTCMonth() + delta);
    else d.setUTCDate(d.getUTCDate() + delta * 7);
    setAnchor(ymd(d));
  }

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fmt(dateStr: string, opts: Intl.DateTimeFormatOptions): string {
    return asDate(dateStr).toLocaleDateString("nl-NL", {
      ...opts,
      timeZone: "UTC",
    });
  }

  // Periode-label uit de server-range.
  const rangeLabel = data
    ? period === "month"
      ? fmt(data.from, { month: "long", year: "numeric" })
      : `${fmt(data.from, { day: "numeric", month: "short" })} – ${fmt(data.to, { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  function buildRows(): { code: string; name: string; hours: number }[] {
    return (data?.clients ?? []).map((c) => ({
      code: codeOf(c.company),
      name: c.company.name,
      hours: c.total,
    }));
  }

  async function copyTotals() {
    const rows = buildRows();
    if (!rows.length) return;
    // Tab-gescheiden zodat het netjes in Excel/Clockwise plakt.
    const text = rows.map((r) => `${r.code}\t${fmtHours(r.hours)}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  function downloadCsv() {
    const rows = buildRows();
    if (!rows.length) return;
    const header = "Code,Klant,Uren";
    const body = rows.map(
      (r) => `${r.code},"${r.name.replace(/"/g, '""')}",${fmtHours(r.hours)}`,
    );
    const totalAll = data?.totals.allocatedHours ?? 0;
    body.push(`,Totaal,${fmtHours(totalAll)}`);
    const csv = [header, ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uren-${period}-${data?.from ?? anchor}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = data?.totals;
  const sanity = data?.sanity;
  const hasClients = (data?.clients.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Subtitel + periode-toggle (h1 staat op de pagina zelf) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <ToggleGroup
          type="single"
          variant="outline"
          value={period}
          onValueChange={(v) => v && setPeriod(v as OverviewPeriod)}
        >
          <ToggleGroupItem value="month">{t("month")}</ToggleGroupItem>
          <ToggleGroupItem value="week">{t("week")}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Periode-kiezer */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => shift(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-44 text-center text-sm font-medium capitalize">
          {rangeLabel}
        </span>
        <Button variant="outline" size="icon" onClick={() => shift(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {period === "month" ? (
          <Input
            type="month"
            value={anchor.slice(0, 7)}
            onChange={(e) =>
              e.target.value && setAnchor(`${e.target.value}-01`)
            }
            className="w-auto"
          />
        ) : (
          <Input
            type="date"
            value={anchor}
            onChange={(e) => e.target.value && setAnchor(e.target.value)}
            className="w-auto"
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAnchor(format(new Date(), "yyyy-MM-dd"))}
        >
          {t("today")}
        </Button>
      </div>

      {/* Samenvattings-kaarten */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("totalHours")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fmtHours(totals?.allocatedHours ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("closedDays")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals?.closedDays ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("openDays")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                (totals?.openDays ?? 0) > 0 && "text-amber-600",
              )}
            >
              {totals?.openDays ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("clients")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.clients.length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sanity-check */}
      {sanity && !sanity.ok && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("sanityWarning")}</AlertTitle>
          <AlertDescription>
            {t("sanityDetail", {
              allocated: fmtHours(sanity.allocatedHours),
              net: fmtHours(sanity.netHours),
              diff: fmtHours(sanity.diff),
            })}
          </AlertDescription>
        </Alert>
      )}
      {sanity && sanity.ok && hasClients && (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          {t("sanityOk")}
        </div>
      )}

      {/* Export */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={copyTotals}
          disabled={!hasClients}
        >
          <Copy className="mr-2 h-4 w-4" />
          {t("copyTotals")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadCsv}
          disabled={!hasClients}
        >
          <Download className="mr-2 h-4 w-4" />
          {t("downloadCsv")}
        </Button>
      </div>

      {/* Inhoud */}
      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground">
          {tc("loading")}
        </p>
      ) : !hasClients ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noData")}
          </CardContent>
        </Card>
      ) : period === "month" ? (
        <MonthTable
          clients={data!.clients}
          daysByDate={daysByDate}
          totalHours={data!.totals.allocatedHours}
          expanded={expanded}
          toggleRow={toggleRow}
          fmt={fmt}
          t={t}
        />
      ) : (
        <WeekGrid
          clients={data!.clients}
          cols={weekCols}
          daysByDate={daysByDate}
          fmt={fmt}
          t={t}
        />
      )}
    </div>
  );
}

type Translator = ReturnType<typeof useTranslations>;
type FmtFn = (d: string, o: Intl.DateTimeFormatOptions) => string;

function StatusBadge({
  day,
  t,
}: {
  day: OverviewDay | undefined;
  t: Translator;
}) {
  if (!day) return null;
  if (day.status === "OPEN") {
    return (
      <Badge
        variant="outline"
        className="border-amber-400 text-amber-600 dark:text-amber-400"
      >
        {t("open")}
      </Badge>
    );
  }
  return <Badge variant="secondary">{t("closed")}</Badge>;
}

function MonthTable({
  clients,
  daysByDate,
  totalHours,
  expanded,
  toggleRow,
  fmt,
  t,
}: {
  clients: OverviewClient[];
  daysByDate: Record<string, OverviewDay>;
  totalHours: number;
  expanded: Set<string>;
  toggleRow: (id: string) => void;
  fmt: FmtFn;
  t: Translator;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t("client")}</TableHead>
              <TableHead className="text-right">{t("hours")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => {
              const isOpen = expanded.has(c.companyId);
              const dates = Object.keys(c.byDate).sort();
              return (
                <Fragment key={c.companyId}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => toggleRow(c.companyId)}
                  >
                    <TableCell>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          !isOpen && "-rotate-90",
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{codeOf(c.company)}</span>
                      <span className="ml-2 text-muted-foreground">
                        {c.company.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtHours(c.total)}
                    </TableCell>
                  </TableRow>
                  {isOpen &&
                    dates.map((d) => {
                      const cell = c.byDate[d];
                      const day = daysByDate[d];
                      return (
                        <TableRow
                          key={`${c.companyId}-${d}`}
                          className="bg-muted/40"
                        >
                          <TableCell />
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm tabular-nums">
                                {fmt(d, {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                              <StatusBadge day={day} t={t} />
                              {day && !day.balanced && (
                                <span title={t("unbalanced")}>
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                </span>
                              )}
                            </div>
                            {cell.description && (
                              <div className="text-xs text-muted-foreground">
                                {cell.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmtHours(cell.hours)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </Fragment>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell />
              <TableCell className="font-semibold">{t("total")}</TableCell>
              <TableCell className="text-right font-bold tabular-nums">
                {fmtHours(totalHours)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

function WeekGrid({
  clients,
  cols,
  daysByDate,
  fmt,
  t,
}: {
  clients: OverviewClient[];
  cols: string[];
  daysByDate: Record<string, OverviewDay>;
  fmt: FmtFn;
  t: Translator;
}) {
  const colTotal = (d: string) => daysByDate[d]?.allocatedHours ?? 0;
  const grandTotal = cols.reduce((s, d) => s + colTotal(d), 0);

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40">{t("client")}</TableHead>
              {cols.map((d) => {
                const day = daysByDate[d];
                return (
                  <TableHead key={d} className="text-right">
                    <div className="capitalize">
                      {fmt(d, { weekday: "short" })}
                    </div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {fmt(d, { day: "numeric", month: "short" })}
                    </div>
                    <div className="mt-1 flex justify-end">
                      {day ? (
                        <StatusBadge day={day} t={t} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t("notStarted")}
                        </span>
                      )}
                    </div>
                  </TableHead>
                );
              })}
              <TableHead className="text-right">{t("weekTotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.companyId}>
                <TableCell>
                  <span className="font-medium">{codeOf(c.company)}</span>
                </TableCell>
                {cols.map((d) => {
                  const cell = c.byDate[d];
                  return (
                    <TableCell
                      key={d}
                      className="text-right tabular-nums"
                      title={cell?.description || undefined}
                    >
                      {cell ? (
                        fmtHours(cell.hours)
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-semibold tabular-nums">
                  {fmtHours(c.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">{t("dayTotal")}</TableCell>
              {cols.map((d) => {
                const day = daysByDate[d];
                return (
                  <TableCell
                    key={d}
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      day && !day.balanced && "text-amber-600",
                    )}
                  >
                    {fmtHours(colTotal(d))}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-bold tabular-nums">
                {fmtHours(grandTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
