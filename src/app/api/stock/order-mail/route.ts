import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/resend";
import { safeLogAudit } from "@/lib/audit";

interface OrderRow {
  id: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string | null;
}

// OP = actief + quantity <= 0. BIJNA OP = actief + quantity > 0 + minStock > 0 + quantity <= minStock.
async function buildOrderList(): Promise<{ op: OrderRow[]; bijnaOp: OrderRow[] }> {
  const items = await prisma.stockItem.findMany({
    where: { isActive: true },
    select: { id: true, name: true, quantity: true, minStock: true, unit: true },
    orderBy: { name: "asc" },
  });
  const op = items.filter((i) => i.quantity <= 0);
  const bijnaOp = items.filter(
    (i) => i.quantity > 0 && i.minStock > 0 && i.quantity <= i.minStock,
  );
  return { op, bijnaOp };
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c,
  );
}

function renderTable(title: string, rows: OrderRow[]): string {
  if (rows.length === 0) return "";
  const body = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${esc(r.name)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${r.quantity}${r.unit ? " " + esc(r.unit) : ""}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;">${r.minStock || "—"}</td>
      </tr>`,
    )
    .join("");
  return `
    <h3 style="margin:20px 0 8px;color:#111827;">${esc(title)} (${rows.length})</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="text-align:left;color:#6b7280;">
          <th style="padding:6px 10px;border-bottom:2px solid #e5e7eb;">Item</th>
          <th style="padding:6px 10px;border-bottom:2px solid #e5e7eb;text-align:right;">Huidig</th>
          <th style="padding:6px 10px;border-bottom:2px solid #e5e7eb;text-align:right;">Besteldrempel</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function renderHtml(
  list: { op: OrderRow[]; bijnaOp: OrderRow[] },
  dateStr: string,
): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
    <h2 style="margin:0 0 4px;">ITFlow bestellijst</h2>
    <p style="color:#6b7280;margin:0 0 16px;">${dateStr}</p>
    ${renderTable("OP (aanvullen)", list.op) || '<p style="color:#6b7280;">Niets op.</p>'}
    ${renderTable("Bijna op", list.bijnaOp)}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:12px;">Automatisch samengesteld uit ITFlow-voorraad.</p>
  </div>`;
}

function todayNL(): string {
  return new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}

// GET = preview (niets verzonden).
export async function GET() {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const list = await buildOrderList();
  return NextResponse.json({
    ...list,
    to: process.env.ORDER_MAIL_TO || "administratie@itfin.nl",
    date: todayNL(),
  });
}

// POST = verstuur de bestellijst.
export async function POST() {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await buildOrderList();
  if (list.op.length === 0 && list.bijnaOp.length === 0) {
    return NextResponse.json(
      { error: "Niets te bestellen (geen items op of bijna op)" },
      { status: 400 },
    );
  }

  const to = process.env.ORDER_MAIL_TO || "administratie@itfin.nl";
  const date = todayNL();

  try {
    const result = await sendEmail({
      to,
      subject: `ITFlow bestellijst — ${date}`,
      html: renderHtml(list, date),
    });
    safeLogAudit({
      entityType: "StockItem",
      entityId: "order-mail",
      action: "CREATE",
      userId: user.id,
      metadata: { to, op: list.op.length, bijnaOp: list.bijnaOp.length, mailId: result.id },
    });
    return NextResponse.json({ sent: true, to, id: result.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mail versturen mislukt" },
      { status: 502 },
    );
  }
}
