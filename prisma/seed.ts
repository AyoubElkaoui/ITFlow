import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const dbUrl = new URL(process.env.DATABASE_URL!);
const pool = new Pool({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 5432,
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.slice(1),
  ssl:
    dbUrl.searchParams.get("sslmode") === "require"
      ? { rejectUnauthorized: false }
      : undefined,
});
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

// Load extracted Excel data (optional - only available locally)
const excelDataPath = join(__dirname, "../extracted_data.json");
const excelData: Record<
  string,
  {
    time_entries: Array<{
      employee: string | null;
      date: string | null;
      company: string | null;
      hours: number;
      description: string | null;
    }>;
    tickets: Array<{
      ticket_nr: number | null;
      date: string | null;
      subject: string | null;
      tasks_performed: string | null;
      pc_name: string | null;
      serial_number: string | null;
      pending_tasks: string | null;
      equipment: string | null;
      time_hours: number | null;
      ticket_date: string | null;
      status: string | null;
    }>;
  }
> = existsSync(excelDataPath)
  ? JSON.parse(readFileSync(excelDataPath, "utf-8"))
  : {};

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  // Try DD-MM-YYYY
  const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (match) {
    const d = new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1]),
    );
    if (!isNaN(d.getTime())) return d;
  }
  // Try DD/MM/YYYY
  const match2 = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match2) {
    const d = new Date(
      Number(match2[3]),
      Number(match2[2]) - 1,
      Number(match2[1]),
    );
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function mapTicketStatus(
  status: string | null,
): "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED" {
  if (!status) return "OPEN";
  const s = status.toLowerCase().trim();
  if (s === "closed") return "CLOSED";
  if (s === "open") return "OPEN";
  if (s === "on hold") return "WAITING";
  if (s === "te facturen") return "RESOLVED";
  return "OPEN";
}

function cleanField(val: string | null | undefined): string | null {
  if (!val) return null;
  const cleaned = val.trim();
  if (
    cleaned === "" ||
    cleaned === "SerieNummer:" ||
    cleaned === "Office Licentie:" ||
    cleaned === "n.v.t" ||
    cleaned === "-"
  )
    return null;
  return cleaned;
}

// Map Excel sheet names to shortNames for the company
const companyMap: Record<
  string,
  { name: string; shortName: string; hourlyRate: number }
> = {
  Altum: { name: "Altum TS", shortName: "Altum", hourlyRate: 85 },
  BVZ: { name: "Bureau Verbindende Zorg", shortName: "BVZ", hourlyRate: 75 },
  CodenameFuture: {
    name: "Code Name Future",
    shortName: "CodenameFuture",
    hourlyRate: 85,
  },
  DVA: { name: "DVA", shortName: "DVA", hourlyRate: 75 },
  "Direct Werk": {
    name: "Direct Werk Zorg",
    shortName: "DirectWerk",
    hourlyRate: 75,
  },
  Elmar: { name: "Elmar Services", shortName: "Elmar", hourlyRate: 80 },
  HZB: { name: "Het Zorg Bureau", shortName: "HZB", hourlyRate: 75 },
  Hoenderloo: { name: "Hoenderloo", shortName: "Hoenderloo", hourlyRate: 75 },
  ITFin: { name: "ITFin", shortName: "ITFin", hourlyRate: 0 },
  Interimfinancespecialisten: {
    name: "Interim Finance Specialisten",
    shortName: "IFS",
    hourlyRate: 90,
  },
  JMZ: { name: "JMZorgpartners", shortName: "JMZ", hourlyRate: 75 },
  "Lage Landen Zorg": {
    name: "Lage Landen Zorg",
    shortName: "LLZ",
    hourlyRate: 75,
  },
  Laurier: { name: "Laurier", shortName: "Laurier", hourlyRate: 75 },
  "MUNT Masters": {
    name: "MUNT Masters",
    shortName: "MUNTMasters",
    hourlyRate: 90,
  },
  Maanlander: { name: "Maanlander", shortName: "Maanlander", hourlyRate: 75 },
  MazaZorg: { name: "MazaZorg", shortName: "MazaZorg", hourlyRate: 75 },
  "Moskee El Fath": {
    name: "Moskee El Fath",
    shortName: "ElFath",
    hourlyRate: 60,
  },
  "Moskee Tawheed": {
    name: "Moskee Tawheed",
    shortName: "Tawheed",
    hourlyRate: 60,
  },
  "NLE Automotive": {
    name: "NLE Automotive",
    shortName: "NLEAutomotive",
    hourlyRate: 80,
  },
  Nijkerk: { name: "Nijkerk", shortName: "Nijkerk", hourlyRate: 75 },
  Qwic: { name: "Qwic", shortName: "Qwic", hourlyRate: 85 },
  Qwick: { name: "Qwick", shortName: "Qwick", hourlyRate: 85 },
  RajaThuisZorg: {
    name: "Raja Thuiszorg",
    shortName: "RajaThuisZorg",
    hourlyRate: 75,
  },
  TRC: { name: "The Ryck Coopers", shortName: "TRC", hourlyRate: 80 },
  "The Future Company": {
    name: "The Future Company",
    shortName: "TFC",
    hourlyRate: 80,
  },
  VALWKS: { name: "VALWKS", shortName: "VALWKS", hourlyRate: 75 },
  "Vol Op Zorg": {
    name: "Vol Op Zorg",
    shortName: "VolOpZorg",
    hourlyRate: 75,
  },
  ZVOS: {
    name: "Zorg Voor Ons Samen / Fellow Zorg",
    shortName: "ZVOS",
    hourlyRate: 75,
  },
  Zonneschijnzorg: {
    name: "ZonneSchijnZorg",
    shortName: "Zonneschijnzorg",
    hourlyRate: 75,
  },
  Zorgkompas: {
    name: "Het Zorgkompas",
    shortName: "Zorgkompas",
    hourlyRate: 75,
  },
};

async function main() {
  console.log("Seeding database with real data...");

  // ── Users ──
  const hashedPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "ayoub@itfin.nl" },
    update: {},
    create: {
      email: "ayoub@itfin.nl",
      name: "Ayoub Elkaoui",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("Created admin user:", admin.email);

  // ── Companies ──
  const companyIds: Record<string, string> = {};
  for (const [sheetName, info] of Object.entries(companyMap)) {
    const company = await prisma.company.upsert({
      where: { shortName: info.shortName },
      update: {},
      create: {
        name: info.name,
        shortName: info.shortName,
        hourlyRate: info.hourlyRate,
        isActive: true,
      },
    });
    companyIds[sheetName] = company.id;
  }
  console.log(`Seeded ${Object.keys(companyIds).length} companies`);

  // ── SLA Policies ──
  const slaPolicies = [
    {
      name: "Urgent SLA",
      priority: "URGENT" as const,
      responseTimeHours: 1,
      resolveTimeHours: 4,
    },
    {
      name: "High SLA",
      priority: "HIGH" as const,
      responseTimeHours: 4,
      resolveTimeHours: 8,
    },
    {
      name: "Normal SLA",
      priority: "NORMAL" as const,
      responseTimeHours: 8,
      resolveTimeHours: 24,
    },
    {
      name: "Low SLA",
      priority: "LOW" as const,
      responseTimeHours: 24,
      resolveTimeHours: 72,
    },
  ];
  for (const sla of slaPolicies) {
    await prisma.slaPolicy.upsert({
      where: { priority: sla.priority },
      update: {},
      create: sla,
    });
  }
  console.log(`Seeded ${slaPolicies.length} SLA policies`);

  // ── KB Categories ──
  const kbCategories = [
    {
      name: "Handleidingen",
      slug: "handleidingen",
      icon: "BookOpen",
      sortOrder: 1,
    },
    {
      name: "Troubleshooting",
      slug: "troubleshooting",
      icon: "Wrench",
      sortOrder: 2,
    },
    { name: "Netwerk", slug: "netwerk", icon: "Wifi", sortOrder: 3 },
    { name: "Beveiliging", slug: "beveiliging", icon: "Shield", sortOrder: 4 },
    {
      name: "Procedures",
      slug: "procedures",
      icon: "ClipboardList",
      sortOrder: 5,
    },
  ];
  for (const cat of kbCategories) {
    await prisma.kbCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`Seeded ${kbCategories.length} KB categories`);

  // ── Tickets from Excel (Zoho Desk) ──
  let ticketCount = 0;
  let timeEntryCount = 0;
  const seenTicketNumbers = new Set<number>();

  for (const [sheetName, data] of Object.entries(excelData)) {
    const companyId = companyIds[sheetName];
    if (!companyId) continue;

    // Import tickets
    for (const t of data.tickets) {
      if (!t.ticket_nr || !t.subject) continue;
      if (seenTicketNumbers.has(t.ticket_nr)) continue;
      seenTicketNumbers.add(t.ticket_nr);

      const ticketDate =
        parseDate(t.date) || parseDate(t.ticket_date) || new Date();
      const status = mapTicketStatus(t.status);
      const pcName = cleanField(t.pc_name);
      const serialNumber = cleanField(t.serial_number);
      const tasksPerformed = cleanField(t.tasks_performed);
      const pendingTasks = cleanField(t.pending_tasks);
      const equipment = cleanField(t.equipment);

      const resolvedAt =
        status === "RESOLVED" || status === "CLOSED"
          ? new Date(ticketDate.getTime() + 86400000)
          : undefined;
      const closedAt =
        status === "CLOSED"
          ? new Date(ticketDate.getTime() + 2 * 86400000)
          : undefined;

      const ticket = await prisma.ticket.upsert({
        where: { ticketNumber: t.ticket_nr },
        update: {},
        create: {
          ticketNumber: t.ticket_nr,
          companyId,
          subject: t.subject.substring(0, 255),
          description: t.subject,
          status,
          priority: "NORMAL",
          assignedToId: admin.id,
          createdById: admin.id,
          pcName,
          serialNumber,
          tasksPerformed,
          pendingTasks,
          equipmentTaken: equipment,
          createdAt: ticketDate,
          resolvedAt,
          closedAt,
        },
      });

      // If ticket has time, create a time entry for it
      if (t.time_hours && t.time_hours > 0) {
        await prisma.timeEntry.create({
          data: {
            ticketId: ticket.id,
            companyId,
            userId: admin.id,
            date: ticketDate,
            hours: t.time_hours,
            description: tasksPerformed || t.subject,
            billable: true,
          },
        });
        timeEntryCount++;
      }

      ticketCount++;
    }

    // Import time entries (Clockwise uren)
    for (const te of data.time_entries) {
      if (!te.hours || te.hours <= 0) continue;
      const entryDate = parseDate(te.date);
      if (!entryDate) continue;

      await prisma.timeEntry.create({
        data: {
          companyId,
          userId: admin.id,
          date: entryDate,
          hours: te.hours,
          description: te.description || "Werkzaamheden",
          billable: true,
        },
      });
      timeEntryCount++;
    }
  }

  console.log(`Seeded ${ticketCount} tickets`);
  console.log(`Seeded ${timeEntryCount} time entries`);

  console.log("\nSeeding complete!");
  console.log("Login: ayoub@itfin.nl / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
