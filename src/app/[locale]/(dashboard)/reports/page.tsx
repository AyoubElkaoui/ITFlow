"use client";

import { useTranslations } from "next-intl";

import { useState, useMemo } from "react";
import { useTickets } from "@/hooks/use-tickets";
import { useTimeEntries } from "@/hooks/use-time-entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanySelect } from "@/components/shared/company-select";
import { UserSelect } from "@/components/shared/user-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart3, Clock, Download, FileText, Ticket } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
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
  description?: string | null;
  company: {
    id: string;
    shortName: string;
    hourlyRate: string | null;
  };
  user: {
    id: string;
    name: string;
  };
  ticket?: {
    id: string;
    ticketNumber: number;
    subject: string;
  } | null;
}

interface TicketRow {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  companyId: string;
  assignedToId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  firstResponseAt: string | null;
  company: {
    id: string;
    shortName: string;
  };
  assignedTo: {
    id: string;
    name: string;
  } | null;
}

interface CompanyBreakdown {
  companyId: string;
  shortName: string;
  tickets: number;
  hours: number;
  billableHours: number;
  revenue: number;
  avgResponse: string;
}

interface EmployeeBreakdown {
  userId: string;
  name: string;
  tickets: number;
  hours: number;
  billableHours: number;
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
  const [userId, setUserId] = useState("all");

  const ticketFilters = {
    companyId: companyId !== "all" ? companyId : undefined,
    assignedToId: userId !== "all" ? userId : undefined,
    from: fromDate,
    to: toDate,
    pageSize: 1000,
  };

  const timeFilters = {
    companyId: companyId !== "all" ? companyId : undefined,
    userId: userId !== "all" ? userId : undefined,
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
    () =>
      Math.round(
        timeEntries.reduce((sum, e) => sum + parseFloat(e.hours || "0"), 0) * 4,
      ) / 4,
    [timeEntries],
  );

  const totalBillableHours = useMemo(
    () =>
      Math.round(
        timeEntries
          .filter((e) => e.billable)
          .reduce((sum, e) => sum + parseFloat(e.hours || "0"), 0) * 4,
      ) / 4,
    [timeEntries],
  );

  const totalRevenue = useMemo(
    () =>
      timeEntries
        .filter((e) => e.billable)
        .reduce((sum, e) => {
          const hours = parseFloat(e.hours || "0");
          const rate = e.company?.hourlyRate
            ? parseFloat(e.company.hourlyRate)
            : 0;
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
        revenue: 0,
        avgResponse: "-",
        _responseTimes: [],
      };
      const hours = parseFloat(e.hours || "0");
      existing.hours += hours;
      if (e.billable) {
        existing.billableHours += hours;
        const rate = e.company?.hourlyRate
          ? parseFloat(e.company.hourlyRate)
          : 0;
        existing.revenue += hours * rate;
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
        revenue: 0,
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
              : `${avgHours.toFixed(2)}h`;
        }
        return row;
      })
      .sort((a, b) => b.hours - a.hours);
  }, [timeEntries, tickets]);

  // Employee breakdown table
  const employeeBreakdown = useMemo(() => {
    const map = new Map<string, EmployeeBreakdown>();

    timeEntries.forEach((e) => {
      const uId = e.user?.id || "unknown";
      const existing = map.get(uId) || {
        userId: uId,
        name: e.user?.name || "Unknown",
        tickets: 0,
        hours: 0,
        billableHours: 0,
      };
      const hours = parseFloat(e.hours || "0");
      existing.hours += hours;
      if (e.billable) {
        existing.billableHours += hours;
      }
      map.set(uId, existing);
    });

    const ticketsByUser = new Map<string, Set<string>>();
    tickets.forEach((t) => {
      const uId = t.assignedTo?.id || t.assignedToId || "unknown";
      const name = t.assignedTo?.name || "Unknown";
      if (!ticketsByUser.has(uId)) ticketsByUser.set(uId, new Set());
      ticketsByUser.get(uId)!.add(t.id);
      if (!map.has(uId)) {
        map.set(uId, {
          userId: uId,
          name,
          tickets: 0,
          hours: 0,
          billableHours: 0,
        });
      }
    });

    ticketsByUser.forEach((ticketIds, uId) => {
      const existing = map.get(uId);
      if (existing) existing.tickets = ticketIds.size;
    });

    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [timeEntries, tickets]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const r2 = (v: number) => Math.round(v * 100) / 100;
    const fmtCurrency = (v: number) =>
      `€ ${v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
    const fmtDate = (d: string | null | undefined) => {
      if (!d) return "-";
      try {
        return format(new Date(d), "dd-MM-yyyy");
      } catch {
        return "-";
      }
    };
    const fmtDateTime = (d: string | null | undefined) => {
      if (!d) return "-";
      try {
        return format(new Date(d), "dd-MM-yyyy HH:mm");
      } catch {
        return "-";
      }
    };

    // --- Sheet 1: Samenvatting (Summary) ---
    const companyLabel =
      companyId !== "all"
        ? companyBreakdown.find((c) => c.companyId === companyId)?.shortName ||
          companyId
        : "Alle bedrijven";
    const employeeLabel =
      userId !== "all"
        ? employeeBreakdown.find((e) => e.userId === userId)?.name || userId
        : "Alle medewerkers";

    const summaryData: (string | number)[][] = [
      [t("title"), `${fromDate} - ${toDate}`],
      [],
      [t("period"), `${fromDate} - ${toDate}`],
      [t("company"), companyLabel],
      [t("employee"), employeeLabel],
      [],
      [t("totalTickets"), totalTickets],
      [t("totalHours"), r2(totalHours)],
      [t("billableHours"), r2(totalBillableHours)],
      [t("revenue"), fmtCurrency(totalRevenue)],
      [t("avgHoursPerDay"), r2(avgHoursPerDay)],
      [],
      [t("statusDistribution"), ""],
    ];
    ticketStatusData.forEach((s) => {
      summaryData.push([s.name, s.value]);
    });
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, t("summary"));

    // --- Sheet 2: Tickets ---
    const ticketHeader = [
      "Ticket #",
      tc("subject"),
      t("company"),
      tc("status"),
      tc("priority"),
      tc("category"),
      t("created"),
      t("resolved"),
      t("closed"),
    ];
    const ticketRows = tickets.map((tk) => [
      tk.ticketNumber || "-",
      tk.subject || "-",
      tk.company?.shortName || "-",
      tk.status || "-",
      tk.priority || "-",
      tk.category || "-",
      fmtDateTime(tk.createdAt),
      fmtDateTime(tk.resolvedAt),
      fmtDateTime(tk.closedAt),
    ]);
    const ticketSheet = XLSX.utils.aoa_to_sheet([ticketHeader, ...ticketRows]);
    // Auto-width columns
    const ticketColWidths = ticketHeader.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...ticketRows.map((r) => String(r[i] || "").length),
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ticketSheet["!cols"] = ticketColWidths;
    XLSX.utils.book_append_sheet(wb, ticketSheet, t("ticketList"));

    // --- Sheet 3: Uurregistraties (Time Entries) ---
    const timeHeader = [
      tc("date"),
      t("company"),
      t("employee"),
      "Ticket #",
      t("description"),
      t("hours"),
      tc("billable"),
      t("rate"),
      t("amount"),
    ];
    const timeRows = timeEntries.map((e) => {
      const hours = parseFloat(e.hours || "0");
      const rate = e.company?.hourlyRate
        ? parseFloat(e.company.hourlyRate)
        : 0;
      const amount = e.billable ? hours * rate : 0;
      return [
        fmtDate(e.date),
        e.company?.shortName || "-",
        e.user?.name || "-",
        e.ticket?.ticketNumber ? `#${e.ticket.ticketNumber}` : "-",
        e.description || "-",
        r2(hours),
        e.billable ? tc("yes") : tc("no"),
        e.billable ? fmtCurrency(rate) : "-",
        e.billable ? fmtCurrency(amount) : "-",
      ];
    });
    // Totals row
    const timeTotalHours = timeEntries.reduce(
      (s, e) => s + parseFloat(e.hours || "0"),
      0,
    );
    const timeTotalAmount = timeEntries
      .filter((e) => e.billable)
      .reduce((s, e) => {
        const h = parseFloat(e.hours || "0");
        const rate = e.company?.hourlyRate
          ? parseFloat(e.company.hourlyRate)
          : 0;
        return s + h * rate;
      }, 0);
    timeRows.push([
      tc("total"),
      "",
      "",
      "",
      "",
      r2(timeTotalHours),
      "",
      "",
      fmtCurrency(timeTotalAmount),
    ]);
    const timeSheet = XLSX.utils.aoa_to_sheet([timeHeader, ...timeRows]);
    const timeColWidths = timeHeader.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...timeRows.map((r) => String(r[i] || "").length),
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
    timeSheet["!cols"] = timeColWidths;
    XLSX.utils.book_append_sheet(wb, timeSheet, t("timeEntryList"));

    // --- Sheet 4: Per bedrijf (Company breakdown) ---
    const companyHeader = [
      t("company"),
      t("tickets"),
      t("hours"),
      t("billableHours"),
      t("revenue"),
      t("avgResponse"),
    ];
    const companyRows = companyBreakdown.map((row) => [
      row.shortName,
      row.tickets,
      r2(row.hours),
      r2(row.billableHours),
      fmtCurrency(row.revenue),
      row.avgResponse,
    ]);
    companyRows.push([
      tc("total"),
      companyBreakdown.reduce((s, r) => s + r.tickets, 0),
      r2(companyBreakdown.reduce((s, r) => s + r.hours, 0)),
      r2(companyBreakdown.reduce((s, r) => s + r.billableHours, 0)),
      fmtCurrency(companyBreakdown.reduce((s, r) => s + r.revenue, 0)),
      "-",
    ]);
    const companySheet = XLSX.utils.aoa_to_sheet([
      companyHeader,
      ...companyRows,
    ]);
    companySheet["!cols"] = [
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, companySheet, t("companyBreakdown"));

    // --- Sheet 5: Per medewerker (Employee breakdown) ---
    const employeeHeader = [
      t("employee"),
      t("tickets"),
      t("hours"),
      t("billableHours"),
    ];
    const employeeRows = employeeBreakdown.map((row) => [
      row.name,
      row.tickets,
      r2(row.hours),
      r2(row.billableHours),
    ]);
    employeeRows.push([
      tc("total"),
      employeeBreakdown.reduce((s, r) => s + r.tickets, 0),
      r2(employeeBreakdown.reduce((s, r) => s + r.hours, 0)),
      r2(employeeBreakdown.reduce((s, r) => s + r.billableHours, 0)),
    ]);
    const employeeSheet = XLSX.utils.aoa_to_sheet([
      employeeHeader,
      ...employeeRows,
    ]);
    employeeSheet["!cols"] = [
      { wch: 25 },
      { wch: 10 },
      { wch: 10 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, employeeSheet, t("employeeBreakdown"));

    XLSX.writeFile(wb, `rapport_${fromDate}_${toDate}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const autoTable = (opts: Record<string, unknown>) =>
      (
        doc as unknown as {
          autoTable: (options: Record<string, unknown>) => void;
        }
      ).autoTable(opts);
    const getFinalY = () =>
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY;

    const r2 = (v: number) => Math.round(v * 100) / 100;
    const fmtCurrency = (v: number) =>
      `€ ${v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
    const fmtDate = (d: string | null | undefined) => {
      if (!d) return "-";
      try {
        return format(new Date(d), "dd-MM-yyyy");
      } catch {
        return "-";
      }
    };
    const truncate = (s: string | null | undefined, max: number) => {
      if (!s) return "-";
      return s.length > max ? s.slice(0, max) + "..." : s;
    };

    const companyLabel =
      companyId !== "all"
        ? companyBreakdown.find((c) => c.companyId === companyId)?.shortName ||
          ""
        : "";

    // --- Page 1: Cover / Summary ---
    doc.setFontSize(18);
    doc.text(`Rapportage ${fromDate} - ${toDate}`, 14, 22);

    if (companyLabel) {
      doc.setFontSize(12);
      doc.text(`${t("company")}: ${companyLabel}`, 14, 32);
    }

    // Summary stats table
    doc.setFontSize(13);
    doc.text(t("summary"), 14, companyLabel ? 44 : 36);

    autoTable({
      startY: companyLabel ? 48 : 40,
      head: [[t("totalTickets"), t("totalHours"), t("billableHours"), t("revenue")]],
      body: [
        [
          totalTickets,
          r2(totalHours).toFixed(2),
          r2(totalBillableHours).toFixed(2),
          fmtCurrency(totalRevenue),
        ],
      ],
      styles: { fontSize: 10, halign: "center" },
      headStyles: { fillColor: [41, 128, 185], halign: "center" },
      columnStyles: {
        0: { halign: "center" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
      },
    });

    // Status distribution table
    if (ticketStatusData.length > 0) {
      const statusY = getFinalY() + 10;
      doc.setFontSize(13);
      doc.text(t("statusDistribution"), 14, statusY);

      autoTable({
        startY: statusY + 4,
        head: [[tc("status"), t("tickets")]],
        body: ticketStatusData.map((s) => [s.name, s.value]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] },
      });
    }

    // --- Company Breakdown Table ---
    doc.addPage();
    doc.setFontSize(14);
    doc.text(t("companyBreakdown"), 14, 20);

    const companyBody = companyBreakdown.map((row) => [
      row.shortName,
      row.tickets,
      row.hours.toFixed(2),
      row.billableHours.toFixed(2),
      fmtCurrency(row.revenue),
      row.avgResponse,
    ]);
    companyBody.push([
      tc("total"),
      companyBreakdown.reduce((s, r) => s + r.tickets, 0),
      companyBreakdown.reduce((s, r) => s + r.hours, 0).toFixed(2),
      companyBreakdown.reduce((s, r) => s + r.billableHours, 0).toFixed(2),
      fmtCurrency(companyBreakdown.reduce((s, r) => s + r.revenue, 0)),
      "-",
    ]);

    autoTable({
      startY: 24,
      head: [
        [
          t("company"),
          t("tickets"),
          t("hours"),
          t("billableHours"),
          t("revenue"),
          t("avgResponse"),
        ],
      ],
      body: companyBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      didParseCell: (data: { row: { index: number }; cell: { styles: { fontStyle: string } } }) => {
        if (data.row.index === companyBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // --- Employee Breakdown Table ---
    const empY = getFinalY() + 12;
    doc.setFontSize(14);
    doc.text(t("employeeBreakdown"), 14, empY);

    const empBody = employeeBreakdown.map((row) => [
      row.name,
      row.tickets,
      row.hours.toFixed(2),
      row.billableHours.toFixed(2),
    ]);
    empBody.push([
      tc("total"),
      employeeBreakdown.reduce((s, r) => s + r.tickets, 0),
      employeeBreakdown.reduce((s, r) => s + r.hours, 0).toFixed(2),
      employeeBreakdown.reduce((s, r) => s + r.billableHours, 0).toFixed(2),
    ]);

    autoTable({
      startY: empY + 4,
      head: [[t("employee"), t("tickets"), t("hours"), t("billableHours")]],
      body: empBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      didParseCell: (data: { row: { index: number }; cell: { styles: { fontStyle: string } } }) => {
        if (data.row.index === empBody.length - 1) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // --- Ticket List Table ---
    if (tickets.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text(t("ticketList"), 14, 20);

      autoTable({
        startY: 24,
        head: [
          [
            "#",
            tc("subject"),
            t("company"),
            tc("status"),
            tc("priority"),
            tc("date"),
          ],
        ],
        body: tickets.map((tk) => [
          tk.ticketNumber || "-",
          truncate(tk.subject, 40),
          tk.company?.shortName || "-",
          tk.status || "-",
          tk.priority || "-",
          fmtDate(tk.createdAt),
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 55 },
          2: { cellWidth: 28 },
          3: { cellWidth: 22 },
          4: { cellWidth: 18 },
          5: { cellWidth: 24 },
        },
      });
    }

    // --- Time Entries Table ---
    if (timeEntries.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text(t("timeEntryList"), 14, 20);

      const teBody = timeEntries.map((e) => {
        const hours = parseFloat(e.hours || "0");
        const rate = e.company?.hourlyRate
          ? parseFloat(e.company.hourlyRate)
          : 0;
        const amount = e.billable ? hours * rate : 0;
        return [
          fmtDate(e.date),
          e.company?.shortName || "-",
          e.ticket?.ticketNumber ? `#${e.ticket.ticketNumber}` : "-",
          truncate(e.description, 35),
          r2(hours).toFixed(2),
          e.billable ? tc("yes") : tc("no"),
          e.billable ? fmtCurrency(amount) : "-",
        ];
      });
      // Totals row
      teBody.push([
        tc("total"),
        "",
        "",
        "",
        r2(totalHours).toFixed(2),
        "",
        fmtCurrency(totalRevenue),
      ]);

      autoTable({
        startY: 24,
        head: [
          [
            tc("date"),
            t("company"),
            "Ticket",
            t("description"),
            t("hours"),
            tc("billable"),
            t("amount"),
          ],
        ],
        body: teBody,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185] },
        didParseCell: (data: { row: { index: number }; cell: { styles: { fontStyle: string } } }) => {
          if (data.row.index === teBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
    }

    doc.save(`rapport_${fromDate}_${toDate}.pdf`);
  };

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
          <div className="space-y-1.5">
            <Label>{t("employee")}</Label>
            <div className="w-[200px]">
              <UserSelect value={userId} onValueChange={setUserId} allowAll />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-1" />
              {t("exportExcel")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <FileText className="h-4 w-4 mr-1" />
              {t("exportPdf")}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <div className="text-3xl font-bold">{totalHours.toFixed(2)}</div>
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
                {avgHoursPerDay.toFixed(2)}
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
                  <TableHead className="text-right">
                    {t("billableHours")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("avgResponse")}
                  </TableHead>
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
                      {row.hours.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.billableHours.toFixed(2)}
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
                      .toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {companyBreakdown
                      .reduce((s, r) => s + r.billableHours, 0)
                      .toFixed(2)}
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

      {/* Employee Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("employeeBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : employeeBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("noData")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("employee")}</TableHead>
                  <TableHead className="text-right">{t("tickets")}</TableHead>
                  <TableHead className="text-right">{t("hours")}</TableHead>
                  <TableHead className="text-right">
                    {t("billableHours")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeBreakdown.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">{row.tickets}</TableCell>
                    <TableCell className="text-right">
                      {row.hours.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.billableHours.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="font-semibold border-t-2">
                  <TableCell>{tc("total")}</TableCell>
                  <TableCell className="text-right">
                    {employeeBreakdown.reduce((s, r) => s + r.tickets, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {employeeBreakdown
                      .reduce((s, r) => s + r.hours, 0)
                      .toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {employeeBreakdown
                      .reduce((s, r) => s + r.billableHours, 0)
                      .toFixed(2)}
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
