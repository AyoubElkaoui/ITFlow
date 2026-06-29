"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  CalendarCheck,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";

import { useCompanies } from "@/hooks/use-companies";
import {
  useWorkDay,
  useCloseWorkDay,
  type WorkDayCompany,
} from "@/hooks/use-workday";
import { generateClockwiseFormat, sumHours } from "@/lib/clockwise";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { TimeInput } from "@/components/ui/time-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Row {
  companyId: string;
  company: WorkDayCompany | null;
  hours: number;
  description: string;
}

function codeOf(company: WorkDayCompany | null): string {
  if (!company) return "?";
  return company.clockwiseCode?.trim() || company.shortName;
}

export default function DagafsluitingPage() {
  const t = useTranslations("dagafsluiting");
  const tc = useTranslations("common");

  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [start, setStart] = useState("09:00");
  const [netHours, setNetHours] = useState(8);
  const [rows, setRows] = useState<Row[]>([]);

  const { data, isLoading, dataUpdatedAt } = useWorkDay(date);
  const closeDay = useCloseWorkDay();
  const { data: companiesData } = useCompanies(undefined, true);
  const companies = (companiesData as WorkDayCompany[] | undefined) || [];

  // Seed lokale state uit het voorstel / de bestaande dag zodra er (nieuwe)
  // serverdata binnenkomt. dataUpdatedAt verandert bij elke succesvolle fetch,
  // dus ook na het afsluiten + opnieuw ophalen.
  const [seededAt, setSeededAt] = useState(0);
  if (data && dataUpdatedAt !== seededAt) {
    setSeededAt(dataUpdatedAt);
    setStart(data.start);
    setNetHours(data.netHours);
    setRows(
      data.allocations.map((a) => ({
        companyId: a.companyId,
        company: a.company,
        hours: a.hours,
        description: a.description ?? "",
      })),
    );
  }

  const target = Math.round(netHours * 4) / 4;
  const sum = sumHours(rows);
  const remaining = Math.round((target - sum) * 4) / 4;
  const allRowsValid = rows.length > 0 && rows.every((r) => r.companyId);
  const sumOk = sum === target;
  const canClose = sumOk && allRowsValid && !closeDay.isPending;

  const preview = generateClockwiseFormat({
    start,
    entries: rows.map((r) => ({
      code: codeOf(r.company),
      hours: r.hours,
      description: r.description,
    })),
  });

  const isClosed = data?.status === "CLOSED";

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function selectCompany(index: number, companyId: string) {
    const company = companies.find((c) => c.id === companyId) ?? null;
    updateRow(index, { companyId, company });
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { companyId: "", company: null, hours: 0, description: "" },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleNoPause(checked: boolean) {
    setNetHours(checked ? 8.5 : 8);
  }

  async function copyDistribution() {
    try {
      await navigator.clipboard.writeText(preview.distribution);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  async function handleClose() {
    if (!canClose) return;
    try {
      await closeDay.mutateAsync({
        date: new Date(date),
        start,
        netHours: target,
        allocations: rows.map((r) => ({
          companyId: r.companyId,
          hours: r.hours,
          description: r.description,
        })),
      });
      toast.success(t("closed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveFailed"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <CalendarCheck className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </div>

      {isClosed && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("reopenHint")}
        </div>
      )}

      {/* Dag-envelope */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-6">
          <div className="space-y-1.5">
            <Label>{t("start")}</Label>
            <TimeInput value={start} onChange={setStart} className="w-28" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("netHours")}</Label>
            <Input
              type="number"
              step="0.25"
              min="0"
              max="24"
              value={netHours}
              onChange={(e) => setNetHours(parseFloat(e.target.value) || 0)}
              className="w-28"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch
              id="noPause"
              checked={target === 8.5}
              onCheckedChange={toggleNoPause}
            />
            <Label htmlFor="noPause" className="cursor-pointer">
              {t("noPause")}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Verdeling per klant */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">{t("client")}</CardTitle>
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addRow")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("noClients")}
            </p>
          )}

          {rows.map((row, index) => (
            <div
              key={index}
              className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3 sm:flex-nowrap"
            >
              <div className="w-full space-y-1.5 sm:w-56">
                <Label className="text-xs">{t("client")}</Label>
                <Select
                  value={row.companyId}
                  onValueChange={(v) => selectCompany(index, v)}
                >
                  <SelectTrigger className="w-full">
                    {/* Toon alleen de code in de trigger; de volledige naam staat
                        in de dropdown-lijst en zou anders over de kolom lopen. */}
                    <SelectValue placeholder={t("selectClient")}>
                      {row.company ? codeOf(row.company) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-medium">{codeOf(c)}</span>
                        <span className="ml-2 text-muted-foreground">
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-24 space-y-1.5">
                <Label className="text-xs">{t("hours")}</Label>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  value={row.hours}
                  onChange={(e) =>
                    updateRow(index, { hours: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="flex-1 space-y-1.5 min-w-48">
                <Label className="text-xs">{t("description")}</Label>
                <Input
                  value={row.description}
                  onChange={(e) =>
                    updateRow(index, { description: e.target.value })
                  }
                  placeholder={t("description")}
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(index)}
                aria-label={t("remove")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Som-validatie */}
          {rows.length > 0 && (
            <div className="flex items-center justify-end gap-4 pt-1 text-sm">
              <span className="text-muted-foreground">
                {t("distributed")}:{" "}
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    sumOk ? "text-foreground" : "text-destructive",
                  )}
                >
                  {sum} / {target}
                </span>
              </span>
              {sumOk ? (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" />
                  {t("sumOk")}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {remaining > 0 ? "+" : ""}
                  {remaining} {t("remaining").toLowerCase()}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clockwise preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">{t("preview")}</CardTitle>
          <Button variant="outline" size="sm" onClick={copyDistribution}>
            <Copy className="mr-2 h-4 w-4" />
            {t("copyDistribution")}
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm leading-relaxed">
            {preview.total}
            {"\n"}
            {preview.range}
            {"\n"}
            {preview.distribution}
          </pre>
        </CardContent>
      </Card>

      {/* Afsluiten */}
      <div className="flex items-center justify-end gap-3">
        {!sumOk && rows.length > 0 && (
          <span className="text-sm text-destructive">{t("sumMismatch")}</span>
        )}
        <Button
          size="lg"
          disabled={!canClose}
          onClick={handleClose}
        >
          {closeDay.isPending ? tc("saving") : t("close")}
        </Button>
      </div>

      {isLoading && (
        <p className="text-center text-sm text-muted-foreground">
          {tc("loading")}
        </p>
      )}
    </div>
  );
}
