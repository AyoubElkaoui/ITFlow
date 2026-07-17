import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workDayCloseSchema } from "@/lib/validations";
import { safeLogAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth-utils";
import {
  generateClockwiseFormat,
  sumHours,
  type ClockwiseEntry,
} from "@/lib/clockwise";

const companySelect = {
  id: true,
  shortName: true,
  name: true,
  clockwiseCode: true,
} as const;

interface CompanyLite {
  id: string;
  shortName: string;
  name: string;
  clockwiseCode: string | null;
}

interface AllocationDTO {
  companyId: string;
  company: CompanyLite;
  hours: number;
  description: string;
}

// De Clockwise-code valt terug op shortName als er geen code is ingesteld.
function codeFor(company: CompanyLite): string {
  return company.clockwiseCode?.trim() || company.shortName;
}

function buildFormat(start: string, allocations: AllocationDTO[]) {
  const entries: ClockwiseEntry[] = allocations.map((a) => ({
    code: codeFor(a.company),
    hours: a.hours,
    description: a.description ?? "",
  }));
  return generateClockwiseFormat({ start, entries });
}

// Datum-only (midden van de dag-kolom @db.Date): "2026-06-29" -> midnight UTC.
function dateOnly(value: string | Date): Date {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/**
 * GET /api/workday?date=YYYY-MM-DD
 * Bestaat de dag al -> return 'm. Zo niet -> bouw een VOORSTEL uit de tickets
 * die ik die dag aanmaakte (klanten + omschrijving uit de subjects, uren op 0).
 */
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: "Query param 'date' (YYYY-MM-DD) is required" },
      { status: 400 },
    );
  }

  const date = dateOnly(dateParam);

  const existing = await prisma.workDay.findFirst({
    where: { userId: user.id, date },
    include: {
      allocations: {
        include: { company: { select: companySelect } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (existing) {
    const allocations: AllocationDTO[] = existing.allocations.map((a) => ({
      companyId: a.companyId,
      company: a.company,
      hours: a.hours,
      description: a.description ?? "",
    }));
    return NextResponse.json({
      existing: true,
      date: dateParam,
      start: existing.start,
      netHours: existing.netHours,
      status: existing.status,
      pastedAt: existing.pastedAt,
      allocations,
      format: buildFormat(existing.start, allocations),
    });
  }

  // Voorstel uit mijn geregistreerde uren (TimeEntry) van die dag. Werk-tijd
  // (TicketTimeLog) wordt automatisch een TimeEntry, dus TimeEntry is de complete
  // bron — handmatige uren én timer-uren, zonder dubbeltellen.
  const day = dateOnly(dateParam);
  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id, date: day },
    select: {
      hours: true,
      description: true,
      company: { select: companySelect },
      ticket: { select: { subject: true } },
    },
  });

  // Groepeer per klant: som de uren, omschrijving = distinct notities/subjects.
  interface Acc {
    company: CompanyLite;
    hours: number;
    descriptions: string[];
  }
  const byCompany = new Map<string, Acc>();
  for (const e of entries) {
    const company = e.company;
    const acc = byCompany.get(company.id) ?? {
      company,
      hours: 0,
      descriptions: [],
    };
    acc.hours += Number(e.hours);
    const label = e.description?.trim() || e.ticket?.subject?.trim();
    if (label && !acc.descriptions.includes(label)) {
      acc.descriptions.push(label);
    }
    byCompany.set(company.id, acc);
  }

  // Uren per klant naar boven afgerond op 0.25 (we werken in kwartieren).
  const allocations: AllocationDTO[] = [...byCompany.values()].map((acc) => ({
    companyId: acc.company.id,
    company: acc.company,
    hours: Math.ceil(acc.hours * 4) / 4,
    description: acc.descriptions.join(", "),
  }));

  // Standaard werkdag = 7,5u netto (mét pauze). "Geen pauze" = 8u (in de UI).
  const netHours = 7.5;
  const proposalHours = Math.round(sumHours(allocations) * 4) / 4;

  return NextResponse.json({
    existing: false,
    date: dateParam,
    start: "09:00",
    netHours,
    status: "OPEN",
    allocations,
    // Verschil tussen voorstel-uren en netto-dag, zodat ik zie hoeveel ik nog moet bijstellen.
    proposalHours,
    netDiff: Math.round((proposalHours - netHours) * 4) / 4,
    format: buildFormat("09:00", allocations),
  });
}

/**
 * POST /api/workday
 * Valideer dat de som van de klant-uren gelijk is aan het netto totaal,
 * upsert de dag + verdeling, zet status CLOSED en return het plak-format.
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = workDayCloseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { date, start, netHours, allocations } = parsed.data;

  // De som van de klant-uren MOET gelijk zijn aan het netto totaal.
  const sum = sumHours(allocations);
  const target = Math.round(netHours * 4) / 4;
  if (sum !== target) {
    return NextResponse.json(
      {
        error: "Sum mismatch",
        message: `Verdeelde uren (${sum}) komen niet overeen met netto totaal (${target})`,
        sum,
        netHours: target,
      },
      { status: 400 },
    );
  }

  const day = dateOnly(date);

  const workDay = await prisma.$transaction(async (tx) => {
    const existing = await tx.workDay.findFirst({
      where: { userId: user.id, date: day },
      select: { id: true },
    });

    if (existing) {
      await tx.workDayAllocation.deleteMany({ where: { workDayId: existing.id } });
      return tx.workDay.update({
        where: { id: existing.id },
        data: {
          start,
          netHours: target,
          status: "CLOSED",
          pastedAt: new Date(),
          allocations: {
            create: allocations.map((a) => ({
              companyId: a.companyId,
              hours: a.hours,
              description: a.description || null,
            })),
          },
        },
        include: {
          allocations: {
            include: { company: { select: companySelect } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    return tx.workDay.create({
      data: {
        userId: user.id,
        date: day,
        start,
        netHours: target,
        status: "CLOSED",
        pastedAt: new Date(),
        allocations: {
          create: allocations.map((a) => ({
            companyId: a.companyId,
            hours: a.hours,
            description: a.description || null,
          })),
        },
      },
      include: {
        allocations: {
          include: { company: { select: companySelect } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });

  safeLogAudit({
    entityType: "WorkDay",
    entityId: workDay.id,
    action: "UPDATE",
    userId: user.id,
  });

  const dto: AllocationDTO[] = workDay.allocations.map((a) => ({
    companyId: a.companyId,
    company: a.company,
    hours: a.hours,
    description: a.description ?? "",
  }));

  return NextResponse.json({
    existing: true,
    date: typeof date === "string" ? date : day.toISOString().slice(0, 10),
    start: workDay.start,
    netHours: workDay.netHours,
    status: workDay.status,
    pastedAt: workDay.pastedAt,
    allocations: dto,
    format: buildFormat(workDay.start, dto),
  });
}
