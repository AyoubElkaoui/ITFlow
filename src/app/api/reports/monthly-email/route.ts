import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { zonedYmd } from "@/lib/tz";

// Maandrapportage per mail. Machine-getriggerd (systemd timer, zie deploy/monthly-report):
//  - POST met secret (header x-cron-secret of ?secret=) -> stelt het rapport samen en mailt.
//  - Zonder ?force=1 verstuurt het endpoint ALLEEN op de laatste dag van de maand,
//    zodat de timer simpelweg elke dag mag draaien.
//  - GET is een sessie-beveiligde preview (JSON, verstuurt niets).

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c,
  );
}

// Uren netjes zonder overbodige decimalen (1, 7.5, 5.25).
function fmtHours(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

// @db.Date staat op UTC-middernacht -> formatteer in UTC zodat de kalenderdag klopt.
function fmtDay(d: Date): string {
  return new Date(d).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

interface TicketAgg {
  ticketNumber: number | null;
  subject: string;
  hours: number;
  tasksPerformed: string | null;
  dates: Set<string>;
}

interface CompanyAgg {
  name: string;
  shortName: string;
  hours: number;
  billableHours: number;
  tickets: Map<string, TicketAgg>;
  assets: Map<string, { name: string; type: string }>;
}

interface MonthReport {
  month: string; // "YYYY-MM"
  label: string; // "juli 2026"
  totals: {
    hours: number;
    billableHours: number;
    companies: number;
    tickets: number;
    assets: number;
    entries: number;
  };
  companies: {
    name: string;
    shortName: string;
    hours: number;
    billableHours: number;
    tickets: {
      ticketNumber: number | null;
      subject: string;
      hours: number;
      tasksPerformed: string | null;
      days: string[];
    }[];
    assets: { name: string; type: string }[];
  }[];
}

// Bouwt het maandoverzicht uit alle uren (TimeEntry) in de maand `ym` ("YYYY-MM").
async function buildReport(ym: string): Promise<MonthReport> {
  const [y, mo] = ym.split("-").map(Number);
  const from = new Date(Date.UTC(y, mo - 1, 1));
  const next = new Date(Date.UTC(y, mo, 1));

  const entries = await prisma.timeEntry.findMany({
    where: { date: { gte: from, lt: next } },
    select: {
      date: true,
      hours: true,
      billable: true,
      companyId: true,
      company: { select: { name: true, shortName: true } },
      ticket: {
        select: {
          ticketNumber: true,
          subject: true,
          tasksPerformed: true,
          assetLinks: {
            select: { asset: { select: { id: true, name: true, type: true } } },
          },
        },
      },
    },
    orderBy: [{ companyId: "asc" }, { date: "asc" }],
  });

  const byCompany = new Map<string, CompanyAgg>();
  const allAssets = new Set<string>();

  for (const e of entries) {
    const hours = Number(e.hours);
    const acc =
      byCompany.get(e.companyId) ??
      ({
        name: e.company.name,
        shortName: e.company.shortName,
        hours: 0,
        billableHours: 0,
        tickets: new Map(),
        assets: new Map(),
      } satisfies CompanyAgg);
    acc.hours += hours;
    if (e.billable) acc.billableHours += hours;

    // Ticketloze uren onder een pseudo-sleutel groeperen ("los").
    const key = e.ticket
      ? `#${e.ticket.ticketNumber}`
      : "__none__";
    const t =
      acc.tickets.get(key) ??
      ({
        ticketNumber: e.ticket?.ticketNumber ?? null,
        subject: e.ticket?.subject ?? "Overige uren (geen ticket)",
        hours: 0,
        tasksPerformed: e.ticket?.tasksPerformed ?? null,
        dates: new Set<string>(),
      } satisfies TicketAgg);
    t.hours += hours;
    t.dates.add(fmtDay(e.date));
    acc.tickets.set(key, t);

    for (const link of e.ticket?.assetLinks ?? []) {
      acc.assets.set(link.asset.id, {
        name: link.asset.name,
        type: link.asset.type,
      });
      allAssets.add(link.asset.id);
    }

    byCompany.set(e.companyId, acc);
  }

  const companies = [...byCompany.values()]
    .sort((a, b) => b.hours - a.hours)
    .map((c) => ({
      name: c.name,
      shortName: c.shortName,
      hours: c.hours,
      billableHours: c.billableHours,
      tickets: [...c.tickets.values()]
        .sort((a, b) => b.hours - a.hours)
        .map((t) => ({
          ticketNumber: t.ticketNumber,
          subject: t.subject,
          hours: t.hours,
          tasksPerformed: t.tasksPerformed,
          days: [...t.dates],
        })),
      assets: [...c.assets.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }));

  const totalHours = companies.reduce((s, c) => s + c.hours, 0);
  const billableHours = companies.reduce((s, c) => s + c.billableHours, 0);
  const tickets = companies.reduce((s, c) => s + c.tickets.length, 0);

  const label = from.toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return {
    month: ym,
    label,
    totals: {
      hours: totalHours,
      billableHours,
      companies: companies.length,
      tickets,
      assets: allAssets.size,
      entries: entries.length,
    },
    companies,
  };
}

function renderHtml(r: MonthReport): string {
  const companySections = r.companies
    .map((c) => {
      const rows = c.tickets
        .map(
          (t) => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            ${t.ticketNumber ? `<strong>#${String(t.ticketNumber).padStart(3, "0")}</strong> ` : ""}${esc(t.subject)}
            ${t.tasksPerformed ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${esc(t.tasksPerformed)}</div>` : ""}
          </td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;vertical-align:top;white-space:nowrap;">${esc(t.days.join(", "))}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;white-space:nowrap;">${fmtHours(t.hours)}u</td>
        </tr>`,
        )
        .join("");
      const assets =
        c.assets.length > 0
          ? `<p style="margin:8px 0 0;color:#6b7280;font-size:13px;"><strong>Assets:</strong> ${c.assets
              .map((a) => `${esc(a.name)} <span style="color:#9ca3af;">(${esc(a.type)})</span>`)
              .join(", ")}</p>`
          : "";
      return `
      <div style="margin:24px 0;">
        <h3 style="margin:0 0 2px;color:#111827;">${esc(c.shortName)} <span style="color:#6b7280;font-weight:normal;">${esc(c.name)}</span></h3>
        <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">${fmtHours(c.hours)} uur${c.billableHours !== c.hours ? ` (${fmtHours(c.billableHours)} factureerbaar)` : ""}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="text-align:left;color:#6b7280;">
              <th style="padding:6px 10px;border-bottom:2px solid #e5e7eb;">Ticket / werk</th>
              <th style="padding:6px 10px;border-bottom:2px solid #e5e7eb;">Dagen</th>
              <th style="padding:6px 10px;border-bottom:2px solid #e5e7eb;text-align:right;">Uren</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${assets}
      </div>`;
    })
    .join("");

  return `
  <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#111827;">
    <h2 style="margin:0 0 4px;">Maandrapportage — <span style="text-transform:capitalize;">${esc(r.label)}</span></h2>
    <p style="color:#6b7280;margin:0 0 16px;">
      ${fmtHours(r.totals.hours)} uur${r.totals.billableHours !== r.totals.hours ? ` (${fmtHours(r.totals.billableHours)} factureerbaar)` : ""}
      · ${r.totals.tickets} tickets · ${r.totals.companies} klanten · ${r.totals.assets} assets
    </p>
    ${
      r.companies.length > 0
        ? companySections
        : '<p style="color:#6b7280;">Geen uren geregistreerd deze maand.</p>'
    }
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;">Automatisch samengesteld uit ITFlow (uren, tickets &amp; assets).</p>
  </div>`;
}

// Huidige kalendermaand in NL-tijd ("YYYY-MM").
function currentMonth(): string {
  return zonedYmd(new Date()).slice(0, 7);
}

// Is `ym` de lopende maand én is vandaag de laatste dag ervan (NL-tijd)?
function isLastDayOf(ym: string): boolean {
  const today = zonedYmd(new Date()); // YYYY-MM-DD
  if (today.slice(0, 7) !== ym) return false;
  const [y, mo] = ym.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return Number(today.slice(8, 10)) === lastDay;
}

function validMonth(ym: string | null): ym is string {
  return !!ym && /^\d{4}-\d{2}$/.test(ym);
}

/** GET = sessie-beveiligde preview (JSON, verstuurt niets). */
export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const monthParam = request.nextUrl.searchParams.get("month");
  const ym = validMonth(monthParam) ? monthParam : currentMonth();
  const report = await buildReport(ym);
  return NextResponse.json({
    ...report,
    to: process.env.REPORT_MAIL_TO || process.env.ORDER_MAIL_TO || null,
  });
}

/** POST = stel samen en verstuur. Beveiligd met REPORT_CRON_SECRET (machine). */
export async function POST(request: NextRequest) {
  const secret = process.env.REPORT_CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Monthly report not configured (REPORT_CRON_SECRET ontbreekt)" },
      { status: 503 },
    );
  }
  const sp = request.nextUrl.searchParams;
  const provided =
    request.headers.get("x-cron-secret") || sp.get("secret") || "";
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthParam = sp.get("month");
  const ym = validMonth(monthParam) ? monthParam : currentMonth();
  const force = sp.get("force") === "1";

  // Zonder force alleen op de laatste dag van de doelmaand versturen.
  if (!force && !isLastDayOf(ym)) {
    return NextResponse.json({ sent: false, skipped: true, reason: "not-last-day", month: ym });
  }

  const to = process.env.REPORT_MAIL_TO || process.env.ORDER_MAIL_TO;
  if (!to) {
    return NextResponse.json(
      { error: "Geen ontvanger (REPORT_MAIL_TO/ORDER_MAIL_TO ontbreekt)" },
      { status: 503 },
    );
  }

  const report = await buildReport(ym);

  try {
    const result = await sendEmail({
      to,
      subject: `ITFlow maandrapportage — ${report.label}`,
      html: renderHtml(report),
    });
    logger.info("Monthly report sent", {
      to,
      month: ym,
      hours: report.totals.hours,
      tickets: report.totals.tickets,
      mailId: result.id,
    });
    return NextResponse.json({ sent: true, to, month: ym, id: result.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mail versturen mislukt" },
      { status: 502 },
    );
  }
}
