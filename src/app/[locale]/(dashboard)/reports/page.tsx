"use client";

import { useTranslations } from "next-intl";

import { useState, useMemo } from "react";
import { useTickets } from "@/hooks/use-tickets";
import { useTimeEntries } from "@/hooks/use-time-entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanySelect } from "@/components/shared/company-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Clock, DollarSign, Ticket } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

interface TimeEntry {
  id: string;
  date: string;
  hours: string;
  billable: boolean;
  company: {
    id: string;
    shortName: string;
    hourlyRate: string | null;
  };
}

interface TicketRow {
  id: string;
  status: string;
  priority: string;
  companyId: string;
  createdAt: string;
  firstResponseAt: string | null;
  company: {
    id: string;
    shortName: string;
  };
}

interface CompanyBreakdown {
  companyId: string;
  shortName: string;
  tickets: number;
  hours: number;
  billableHours: number;
  amount: number;
  avgResponse: string;
}

export default function ReportsPage() {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const now = new Date();
  const [fromDate, setFromDate] = useState(
    format(startOfMonth(now), "yyyy-MM-dd"),
  );
  const [toDate, setToDate] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [companyId, setCompanyId] = useState("all");

  const ticketFilters = {
    companyId: companyId !== "all" ? companyId : undefined,
    pageSize: 1000,
  };

  const timeFilters = {
    companyId: companyId !== "all" ? companyId : undefined,
    from: fromDate,
    to: toDate,
    pageSize: 10000,
  };

  const { data: ticketsData, isLoading: ticketsLoading } =
    useTickets(ticketFilters);
  const { data: timeData, isLoading: timeLoading } =
    useTimeEntries(timeFilters);

  const ticketsResponse = ticketsData as
    | { data: TicketRow[]; total: number }
    | undefined;
  const timeResponse = timeData as
    | { data: TimeEntry[]; total: number }
    | undefined;

  const tickets = ticketsResponse?.data || [];
  const timeEntries = timeResponse?.data || [];

  const isLoading = ticketsLoading || timeLoading;

  // --- Computed data ---

  const totalTickets = tickets.length;

  const totalHours = useMemo(
    () => timeEntries.reduce((sum, e) => sum + parseFloat(e.hours || "0"), 0),
    [timeEntries],
  );

  const revenue = useMemo(
    () =>
      timeEntries.reduce((sum, e) => {
        if (!e.billable) return sum;
        const hours = parseFloat(e.hours || "0");
        const rate = parseFloat(e.company?.hourlyRate || "0");
        return sum + hours * rate;
      }, 0),
    [timeEntries],
  );

  const avgHoursPerDay = useMemo(() => {
    const uniqueDays = new Set(timeEntries.map((e) => e.date?.slice(0, 10)));
    const dayCount = uniqueDays.size;
    return dayCount > 0 ? totalHours / dayCount : 0;
  }, [timeEntries, totalHours]);

  // Hours per company chart data
  const hoursPerCompany = useMemo(() => {
    const map = new Map<string, number>();
    timeEntries.forEach((e) => {
      const name = e.company?.shortName || "Unknown";
      map.set(name, (map.get(name) || 0) + parseFloat(e.hours || "0"));
    });
    return Array.from(map.entries())
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 100) / 100 }))
      .sort((a, b) => b.hours - a.hours);
  }, [timeEntries]);

  // Ticket status distribution
  const ticketStatusData = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => {
      const status = t.status || "UNKNOWN";
      map.set(status, (map.get(status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({
      name: status.replace("_", " "),
      value: count,
    }));
  }, [tickets]);

  // Company breakdown table
  const companyBreakdown = useMemo(() => {
    const map = new Map<
      string,
      CompanyBreakdown & { _responseTimes: number[] }
    >();

    timeEntries.forEach((e) => {
      const cId = e.company?.id || "unknown";
      const existing = map.get(cId) || {
        companyId: cId,
        shortName: e.company?.shortName || "Unknown",
        tickets: 0,
        hours: 0,
        billableHours: 0,
        amount: 0,
        avgResponse: "-",
        _responseTimes: [],
      };
      const hours = parseFloat(e.hours || "0");
      existing.hours += hours;
      if (e.billable) {
        existing.billableHours += hours;
        existing.amount += hours * parseFloat(e.company?.hourlyRate || "0");
      }
      map.set(cId, existing);
    });

    tickets.forEach((t) => {
      const cId = t.companyId || t.company?.id || "unknown";
      const existing = map.get(cId) || {
        companyId: cId,
        shortName: t.company?.shortName || "Unknown",
        tickets: 0,
        hours: 0,
        billableHours: 0,
        amount: 0,
        avgResponse: "-",
        _responseTimes: [],
      };
      existing.tickets += 1;
      if (t.firstResponseAt && t.createdAt) {
        const diffMs =
          new Date(t.firstResponseAt).getTime() -
          new Date(t.createdAt).getTime();
        if (diffMs > 0) existing._responseTimes.push(diffMs);
      }
      map.set(cId, existing);
    });

    return Array.from(map.values())
      .map(({ _responseTimes, ...row }) => {
        if (_responseTimes.length > 0) {
          const avgMs =
            _responseTimes.reduce((a, b) => a + b, 0) / _responseTimes.length;
          const avgHours = avgMs / (1000 * 60 * 60);
          row.avgResponse =
            avgHours < 1
              ? `${Math.round(avgHours * 60)}m`
              : `${avgHours.toFixed(1)}h`;
        }
        return row;
      })
      .sort((a, b) => b.hours - a.hours);
  }, [timeEntries, tickets]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="from-date">{t("from")}</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to-date">{t("to")}</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("company")}</Label>
            <div className="w-[200px]">
              <CompanySelect
                value={companyId}
                onValueChange={setCompanyId}
                placeholder="All companies"
                allowAll
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tickets
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold">{totalTickets}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Hours
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold">{totalHours.toFixed(1)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold">
                {revenue.toLocaleString("de-DE", {
                  style: "currency",
                  currency: "EUR",
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Hours/Day
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-3xl font-bold">
                {avgHoursPerDay.toFixed(1)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hours per Company */}
        <Card>
          <CardHeader>
            <CardTitle>{t("hoursPerCompany")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] bg-muted rounded animate-pulse" />
            ) : hoursPerCompany.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                {t("noTimeEntries")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hoursPerCompany}>
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value}h`, "Hours"]}
                  />
                  <Bar
                    dataKey="hours"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Ticket Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t("statusDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] bg-muted rounded animate-pulse" />
            ) : ticketStatusData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                {t("noTickets")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ticketStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {ticketStatusData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Company Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("companyBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : companyBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("noData")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead className="text-right">{t("tickets")}</TableHead>
                  <TableHead className="text-right">{t("hours")}</TableHead>
                  <TableHead className="text-right">{t("billableHours")}</TableHead>
                  <TableHead className="text-right">{t("amount")}</TableHead>
                  <TableHead className="text-right">{t("avgResponse")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyBreakdown.map((row) => (
                  <TableRow key={row.companyId}>
                    <TableCell className="font-medium">
                      {row.shortName}
                    </TableCell>
                    <TableCell className="text-right">{row.tickets}</TableCell>
                    <TableCell className="text-right">
                      {row.hours.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.billableHours.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.amount.toLocaleString("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.avgResponse}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="font-semibold border-t-2">
                  <TableCell>{tc("total")}</TableCell>
                  <TableCell className="text-right">
                    {companyBreakdown.reduce((s, r) => s + r.tickets, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {companyBreakdown
                      .reduce((s, r) => s + r.hours, 0)
                      .toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {companyBreakdown
                      .reduce((s, r) => s + r.billableHours, 0)
                      .toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {companyBreakdown
                      .reduce((s, r) => s + r.amount, 0)
                      .toLocaleString("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    -
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
