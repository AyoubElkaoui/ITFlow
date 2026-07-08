"use client";

import { useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  Search,
  Receipt,
  CheckCircle2,
  RotateCcw,
  List,
  Kanban,
} from "lucide-react";

import { useTickets, useArchiveTicket } from "@/hooks/use-tickets";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CompanySelect } from "@/components/shared/company-select";
import { DONE_STATUS_PARAM } from "@/lib/ticket-status";

interface BillableTicket {
  id: string;
  ticketNumber: number;
  subject: string;
  createdAt: string;
  archivedAt: string | null;
  company: { id: string; shortName: string; name: string };
}

interface MonthGroup {
  ym: string; // "2026-06"
  tickets: BillableTicket[];
}

interface CompanyGroup {
  companyId: string;
  company: BillableTicket["company"];
  total: number;
  openCount: number; // niet-verwerkt
  months: MonthGroup[];
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(ym: string): string {
  return new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function groupTickets(tickets: BillableTicket[]): CompanyGroup[] {
  const byCompany = new Map<string, CompanyGroup>();
  for (const t of tickets) {
    let g = byCompany.get(t.company.id);
    if (!g) {
      g = {
        companyId: t.company.id,
        company: t.company,
        total: 0,
        openCount: 0,
        months: [],
      };
      byCompany.set(t.company.id, g);
    }
    g.total++;
    if (!t.archivedAt) g.openCount++;
  }
  // Vul maanden per bedrijf (gesorteerd, nieuwste eerst)
  for (const g of byCompany.values()) {
    const byMonth = new Map<string, BillableTicket[]>();
    for (const t of tickets) {
      if (t.company.id !== g.companyId) continue;
      const k = monthKey(t.createdAt);
      const arr = byMonth.get(k) ?? [];
      arr.push(t);
      byMonth.set(k, arr);
    }
    g.months = [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, ts]) => ({
        ym,
        tickets: ts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      }));
  }
  return [...byCompany.values()].sort((a, b) => b.openCount - a.openCount);
}

export default function TeFacturerenPage() {
  const t = useTranslations("teFactureren");
  const tc = useTranslations("common");

  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useTickets({
    // Te factureren = alles wat als klaar telt: Opgelost, Te factureren én Gesloten.
    // Zodra een ticket een van die statussen krijgt, verschijnt het hier.
    status: DONE_STATUS_PARAM,
    search: search || undefined,
    companyId: companyId !== "all" ? companyId : undefined,
    archived: showArchived ? undefined : "false",
    pageSize: 2000,
  });

  const archive = useArchiveTicket();

  const response = data as { data: BillableTicket[]; total: number } | undefined;
  const tickets = useMemo(() => response?.data ?? [], [response]);
  const groups = useMemo(() => groupTickets(tickets), [tickets]);
  const totalOpen = groups.reduce((s, g) => s + g.openCount, 0);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function markOne(id: string, archived: boolean) {
    try {
      await archive.mutateAsync({ id, archived });
      toast.success(archived ? t("markedDone") : t("restored"));
    } catch {
      toast.error(tc("saving"));
    }
  }

  async function markGroup(group: CompanyGroup) {
    const open = group.months
      .flatMap((m) => m.tickets)
      .filter((tk) => !tk.archivedAt);
    if (open.length === 0) return;
    if (!window.confirm(t("markGroupConfirm", { count: open.length, company: group.company.shortName })))
      return;
    try {
      await Promise.all(
        open.map((tk) => archive.mutateAsync({ id: tk.id, archived: true })),
      );
      toast.success(t("markedGroupDone", { count: open.length }));
    } catch {
      toast.error(tc("saving"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Receipt className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tickets/board">
            <Button variant="outline" size="sm">
              <Kanban className="mr-2 h-4 w-4" />
              {t("board")}
            </Button>
          </Link>
          <Link href="/tickets">
            <Button variant="outline" size="sm">
              <List className="mr-2 h-4 w-4" />
              {t("list")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-[200px]">
              <CompanySelect
                value={companyId}
                onValueChange={setCompanyId}
                placeholder={tc("allCompanies")}
                allowAll
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="showArchived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              <Label htmlFor="showArchived" className="cursor-pointer">
                {t("showArchived")}
              </Label>
            </div>
            <span className="ml-auto text-sm text-muted-foreground">
              {t("openTotal", { count: totalOpen })}
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
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("allDone")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("allDoneHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => {
                const isOpen = expanded.has(group.companyId);
                return (
                  <div
                    key={group.companyId}
                    className="rounded-lg border border-border"
                  >
                    {/* Bedrijf-header */}
                    <div
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/40"
                      onClick={() => toggle(group.companyId)}
                    >
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`}
                      />
                      <span className="font-medium">
                        {group.company.shortName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {group.company.name}
                      </span>
                      <Badge variant="secondary" className="ml-1">
                        {group.openCount}
                      </Badge>
                      {showArchived && group.total > group.openCount && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {t("archivedCount", {
                            count: group.total - group.openCount,
                          })}
                        </Badge>
                      )}
                      {group.openCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            markGroup(group);
                          }}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          {t("markGroupDone")}
                        </Button>
                      )}
                    </div>

                    {/* Maanden + tickets */}
                    {isOpen && (
                      <div className="border-t border-border">
                        {group.months.map((m) => (
                          <Fragment key={m.ym}>
                            <div className="bg-muted/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">
                              {monthLabel(m.ym)} · {m.tickets.length}
                            </div>
                            {m.tickets.map((tk) => (
                              <div
                                key={tk.id}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30"
                              >
                                <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">
                                  #{String(tk.ticketNumber).padStart(3, "0")}
                                </span>
                                <Link
                                  href={`/tickets/${tk.id}`}
                                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                                >
                                  {tk.subject}
                                </Link>
                                {tk.archivedAt && (
                                  <Badge
                                    variant="outline"
                                    className="text-muted-foreground"
                                  >
                                    {t("archived")}
                                  </Badge>
                                )}
                                <span className="hidden sm:block text-xs text-muted-foreground shrink-0">
                                  {dateLabel(tk.createdAt)}
                                </span>
                                {tk.archivedAt ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markOne(tk.id, false)}
                                  >
                                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                    {t("restore")}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markOne(tk.id, true)}
                                  >
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                    {t("markDone")}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
