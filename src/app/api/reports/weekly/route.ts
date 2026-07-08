import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { APP_TIME_ZONE } from "@/lib/tz";
import { OPEN_STATUSES, DONE_STATUSES } from "@/lib/ticket-status";

// Wekelijks rapport per mail: open tickets + voorraad die besteld moet worden.
// Bedoeld voor een Vercel Cron (maandag 09:00 NL) — zie vercel.json.
//  - GET met geldig cron-secret  -> stelt samen en verstuurt.
//      * Vercel Cron: header "Authorization: Bearer <CRON_SECRET>".
//      * Handmatig:   header "x-cron-secret" of "?secret=" === REPORT_CRON_SECRET.
//  - GET zonder secret            -> sessie-beveiligde preview (JSON, verstuurt niets).
//  - Zonder ?force=1 verstuurt de cron alleen op maandag (NL-tijd).

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c,
  );
}

// 1 = maandag … 7 = zondag, in NL-tijd.
function weekdayNL(d: Date): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
  }).format(d);
  return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[wd] ?? 0;
}

function todayNL(): string {
  return new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  });
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In behandeling",
  WAITING: "Wachtend",
  RESOLVED: "Opgelost",
  CLOSED: "Gesloten",
};

interface WeeklyData {
  dateStr: string;
  tickets: {
    open: number;
    inProgress: number;
    waiting: number;
    newThisWeek: number;
    teFactureren: number;
    list: {
      ticketNumber: number;
      subject: string;
      status: string;
      company: string;
      assignee: string | null;
    }[];
  };
  stock: {
    op: { name: string; quantity: number; minStock: number; unit: string | null }[];
    bijna: { name: string; quantity: number; minStock: number; unit: string | null }[];
  };
}

async function buildWeekly(): Promise<WeeklyData> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  const [open, inProgress, waiting, newThisWeek, teFactureren, list, items] =
    await Promise.all([
      prisma.ticket.count({ where: { status: "OPEN", archivedAt: null } }),
      prisma.ticket.count({ where: { status: "IN_PROGRESS", archivedAt: null } }),
      prisma.ticket.count({ where: { status: "WAITING", archivedAt: null } }),
      prisma.ticket.count({ where: { createdAt: { gte: weekAgo } } }),
      // Deze week klaar-om-te-factureren geworden = Opgelost/Te factureren/Gesloten,
      // nog niet verwerkt, en in de afgelopen 7 dagen gewijzigd (statuswissel zet
      // updatedAt op nu). Bewust NIET de hele backlog — alleen de week.
      prisma.ticket.count({
        where: {
          status: { in: [...DONE_STATUSES] },
          archivedAt: null,
          updatedAt: { gte: weekAgo },
        },
      }),
      prisma.ticket.findMany({
        where: {
          status: { in: [...OPEN_STATUSES] },
          archivedAt: null,
        },
        select: {
          ticketNumber: true,
          subject: true,
          status: true,
          company: { select: { name: true, shortName: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 40,
      }),
      prisma.stockItem.findMany({
        where: { isActive: true },
        select: { name: true, quantity: true, minStock: true, unit: true },
        orderBy: { name: "asc" },
      }),
    ]);

  return {
    dateStr: todayNL(),
    tickets: {
      open,
      inProgress,
      waiting,
      newThisWeek,
      teFactureren,
      list: list.map((t) => ({
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        company: t.company?.shortName || t.company?.name || "",
        assignee: t.assignedTo?.name ?? null,
      })),
    },
    stock: {
      op: items.filter((i) => i.quantity <= 0),
      bijna: items.filter(
        (i) => i.quantity > 0 && i.minStock > 0 && i.quantity <= i.minStock,
      ),
    },
  };
}

// ── E-mail HTML ──────────────────────────────────────────────────────────────
// Tabel-gebaseerd + inline styles, zodat het ook in Outlook (Word-engine) en op
// mobiel netjes en leesbaar rendert. Geen flexbox/grid; vaste 600px-container met
// MSO-ghost-table; media-query verkleint alleen waar ondersteund.

const FONT =
  "font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;";

function kpi(num: number, label: string, color: string): string {
  return `
  <td align="center" width="25%" style="padding:10px 4px;">
    <div style="${FONT}font-size:26px;line-height:1;font-weight:700;color:${color};">${num}</div>
    <div style="${FONT}font-size:12px;line-height:1.3;color:#6b7280;margin-top:4px;">${label}</div>
  </td>`;
}

function ticketRows(list: WeeklyData["tickets"]["list"]): string {
  if (list.length === 0) {
    return `<tr><td colspan="3" style="${FONT}font-size:14px;color:#6b7280;padding:12px 10px;">Geen open tickets. 🎉</td></tr>`;
  }
  return list
    .map(
      (t, i) => `
    <tr${i % 2 ? ' bgcolor="#f9fafb"' : ""}>
      <td style="${FONT}font-size:14px;color:#111827;padding:8px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
        <strong>#${String(t.ticketNumber).padStart(3, "0")}</strong> ${esc(t.subject)}
        <div style="${FONT}font-size:12px;color:#6b7280;margin-top:2px;">${esc(t.company)}${t.assignee ? " · " + esc(t.assignee) : ""}</div>
      </td>
      <td style="${FONT}font-size:12px;color:#374151;padding:8px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top;white-space:nowrap;">${esc(STATUS_LABEL[t.status] ?? t.status)}</td>
    </tr>`,
    )
    .join("");
}

function stockRows(data: WeeklyData["stock"]): string {
  const all = [
    ...data.op.map((i) => ({ ...i, badge: "OP", color: "#b91c1c" })),
    ...data.bijna.map((i) => ({ ...i, badge: "bijna op", color: "#b45309" })),
  ];
  if (all.length === 0) {
    return `<tr><td colspan="3" style="${FONT}font-size:14px;color:#6b7280;padding:12px 10px;">Niets te bestellen.</td></tr>`;
  }
  return all
    .map(
      (i, idx) => `
    <tr${idx % 2 ? ' bgcolor="#f9fafb"' : ""}>
      <td style="${FONT}font-size:14px;color:#111827;padding:8px 10px;border-bottom:1px solid #e5e7eb;">${esc(i.name)}</td>
      <td align="right" style="${FONT}font-size:14px;color:#111827;padding:8px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${i.quantity}${i.unit ? " " + esc(i.unit) : ""}<span style="color:#9ca3af;"> / ${i.minStock || "—"}</span></td>
      <td align="right" style="${FONT}font-size:12px;font-weight:700;color:${i.color};padding:8px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${i.badge}</td>
    </tr>`,
    )
    .join("");
}

function sectionHeader(title: string, sub: string): string {
  return `
  <tr>
    <td style="padding:22px 20px 6px;">
      <div style="${FONT}font-size:17px;font-weight:700;color:#111827;">${title}</div>
      ${sub ? `<div style="${FONT}font-size:13px;color:#6b7280;margin-top:2px;">${sub}</div>` : ""}
    </td>
  </tr>`;
}

function renderHtml(d: WeeklyData): string {
  const toOrder = d.stock.op.length + d.stock.bijna.length;
  return `<!DOCTYPE html>
<html lang="nl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>ITFlow Weekrapport</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
<style>
  @media only screen and (max-width:600px){
    .container{width:100% !important;}
    .kpi{font-size:22px !important;}
    .px{padding-left:14px !important;padding-right:14px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6" style="background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:20px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- header -->
        <tr>
          <td bgcolor="#0f172a" style="background-color:#0f172a;padding:20px 20px;">
            <div style="${FONT}font-size:20px;font-weight:700;color:#ffffff;">ITFlow · Weekrapport</div>
            <div style="${FONT}font-size:13px;color:#cbd5e1;margin-top:3px;text-transform:capitalize;">${esc(d.dateStr)}</div>
          </td>
        </tr>

        <!-- KPI's -->
        <tr>
          <td class="px" style="padding:14px 20px 2px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f9fafb" style="background-color:#f9fafb;border-radius:6px;">
              <tr>
                ${kpi(d.tickets.open, "Open", "#0f172a")}
                ${kpi(d.tickets.inProgress, "In behandeling", "#0f172a")}
                ${kpi(d.tickets.newThisWeek, "Nieuw / week", "#2563eb")}
                ${kpi(d.tickets.teFactureren, "Te factureren / week", "#7c3aed")}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Tickets -->
        ${sectionHeader("Open tickets", `${d.tickets.open + d.tickets.inProgress + d.tickets.waiting} openstaand`)}
        <tr>
          <td class="px" style="padding:4px 20px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <thead>
                <tr>
                  <th align="left" style="${FONT}font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;padding:0 10px 6px;border-bottom:2px solid #e5e7eb;">Ticket</th>
                  <th align="left" style="${FONT}font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;padding:0 10px 6px;border-bottom:2px solid #e5e7eb;white-space:nowrap;">Status</th>
                </tr>
              </thead>
              <tbody>${ticketRows(d.tickets.list)}</tbody>
            </table>
          </td>
        </tr>

        <!-- Voorraad -->
        ${sectionHeader("Voorraad · te bestellen", `${toOrder} item${toOrder === 1 ? "" : "s"} (op / bijna op)`)}
        <tr>
          <td class="px" style="padding:4px 20px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <thead>
                <tr>
                  <th align="left" style="${FONT}font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;padding:0 10px 6px;border-bottom:2px solid #e5e7eb;">Item</th>
                  <th align="right" style="${FONT}font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;padding:0 10px 6px;border-bottom:2px solid #e5e7eb;white-space:nowrap;">Nu / drempel</th>
                  <th align="right" style="${FONT}font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;padding:0 10px 6px;border-bottom:2px solid #e5e7eb;">&nbsp;</th>
                </tr>
              </thead>
              <tbody>${stockRows(d.stock)}</tbody>
            </table>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:18px 20px 22px;border-top:1px solid #e5e7eb;">
            <div style="${FONT}font-size:12px;color:#9ca3af;">Automatisch samengesteld uit ITFlow — elke maandagochtend.</div>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ── Handler ──────────────────────────────────────────────────────────────────

function isCronAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const reportSecret = process.env.REPORT_CRON_SECRET;
  if (reportSecret) {
    const provided =
      request.headers.get("x-cron-secret") ||
      request.nextUrl.searchParams.get("secret") ||
      "";
    if (provided === reportSecret) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const authorized = isCronAuthorized(request);

  // Geen geldig secret -> sessie-beveiligde preview (verstuurt niets).
  if (!authorized) {
    try {
      await getSessionUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await buildWeekly();
    return NextResponse.json({
      preview: true,
      to: process.env.WEEKLY_REPORT_TO || process.env.ORDER_MAIL_TO || "administratie@itfin.nl",
      ...data,
    });
  }

  // Cron: standaard alleen op maandag (NL-tijd), tenzij ?force=1.
  const force = sp.get("force") === "1";
  if (!force && weekdayNL(new Date()) !== 1) {
    return NextResponse.json({ sent: false, skipped: true, reason: "not-monday" });
  }

  const to =
    process.env.WEEKLY_REPORT_TO || process.env.ORDER_MAIL_TO || "administratie@itfin.nl";
  const data = await buildWeekly();

  try {
    const result = await sendEmail({
      to,
      subject: `ITFlow Weekrapport — ${data.dateStr}`,
      html: renderHtml(data),
    });
    logger.info("Weekly report sent", {
      to,
      openTickets: data.tickets.open,
      toOrder: data.stock.op.length + data.stock.bijna.length,
      mailId: result.id,
    });
    return NextResponse.json({ sent: true, to, id: result.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mail versturen mislukt" },
      { status: 502 },
    );
  }
}
