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

// ── CSV parser (handles multiline quoted fields) ──
function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let fields: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && i + 1 < content.length && content[i + 1] === "\n") {
          i++;
        }
        fields.push(current.trim());
        if (fields.some((f) => f !== "")) {
          rows.push(fields);
        }
        fields = [];
        current = "";
      } else {
        current += ch;
      }
    }
  }
  // Last row
  if (current || fields.length > 0) {
    fields.push(current.trim());
    if (fields.some((f) => f !== "")) {
      rows.push(fields);
    }
  }

  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((values) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  // DD-MM-YYYY
  const match = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (match) {
    const d = new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1]),
    );
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function cleanField(val: string | null | undefined): string | null {
  if (!val) return null;
  const cleaned = val.trim();
  if (
    cleaned === "" ||
    cleaned === "SerieNummer:" ||
    cleaned === "Office Licentie:" ||
    cleaned === "n.v.t" ||
    cleaned === "n.v.t." ||
    cleaned === "-"
  )
    return null;
  return cleaned;
}

// ── Company definitions ──
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
  DirectWerk: {
    name: "Direct Werk Zorg",
    shortName: "DirectWerk",
    hourlyRate: 75,
  },
  Elmar: { name: "Elmar Services", shortName: "Elmar", hourlyRate: 80 },
  HZB: { name: "Het Zorg Bureau", shortName: "HZB", hourlyRate: 75 },
  FellowZorg: { name: "Fellow Zorg", shortName: "FellowZorg", hourlyRate: 75 },
  ITFin: { name: "ITFin", shortName: "ITFin", hourlyRate: 0 },
  IFS: {
    name: "Interim Finance Specialisten",
    shortName: "IFS",
    hourlyRate: 90,
  },
  JMZ: { name: "JMZorgpartners", shortName: "JMZ", hourlyRate: 75 },
  LLZ: {
    name: "Lage Landen Zorg",
    shortName: "LLZ",
    hourlyRate: 75,
  },
  Laurier: { name: "Laurier", shortName: "Laurier", hourlyRate: 75 },
  MUNTMasters: {
    name: "MUNT Masters",
    shortName: "MUNTMasters",
    hourlyRate: 90,
  },
  Maanlander: { name: "Maanlander", shortName: "Maanlander", hourlyRate: 75 },
  MazaZorg: { name: "MazaZorg", shortName: "MazaZorg", hourlyRate: 75 },
  ElFath: {
    name: "Moskee El Fath",
    shortName: "ElFath",
    hourlyRate: 60,
  },
  Tawheed: {
    name: "Moskee Tawheed",
    shortName: "Tawheed",
    hourlyRate: 60,
  },
  NLEAutomotive: {
    name: "NLE Automotive",
    shortName: "NLEAutomotive",
    hourlyRate: 80,
  },
  Nijkerk: { name: "Nijkerk", shortName: "Nijkerk", hourlyRate: 75 },
  Qwic: { name: "Qwic", shortName: "Qwic", hourlyRate: 85 },
  RajaThuisZorg: {
    name: "Raja Thuiszorg",
    shortName: "RajaThuisZorg",
    hourlyRate: 75,
  },
  TRC: { name: "The Ryck Coopers", shortName: "TRC", hourlyRate: 80 },
  TFC: {
    name: "The Future Company",
    shortName: "TFC",
    hourlyRate: 80,
  },
  VALWKS: { name: "VALWKS", shortName: "VALWKS", hourlyRate: 75 },
  VolOpZorg: {
    name: "Vol Op Zorg",
    shortName: "VolOpZorg",
    hourlyRate: 75,
  },
  ZVOS: {
    name: "Zorg Voor Ons Samen",
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
  // New companies from CSV
  Webmolen: { name: "Webmolen", shortName: "Webmolen", hourlyRate: 75 },
  Samen100Care: {
    name: "Samen100Care",
    shortName: "Samen100Care",
    hourlyRate: 75,
  },
  Telt: { name: "Telt", shortName: "Telt", hourlyRate: 75 },
  Nano: { name: "Nano", shortName: "Nano", hourlyRate: 75 },
  Nexus: { name: "Nexus", shortName: "Nexus", hourlyRate: 75 },
  IWDZ: { name: "IWDZ", shortName: "IWDZ", hourlyRate: 75 },
  Flexned: {
    name: "Flexned Personeel",
    shortName: "Flexned",
    hourlyRate: 75,
  },
};

// Map CSV company names (uppercase) to companyMap keys
const csvToCompanyKey: Record<string, string> = {
  ALTUM: "Altum",
  BVZ: "BVZ",
  CODENAMEFUTURE: "CodenameFuture",
  DIRECTWERK: "DirectWerk",
  ELMAR: "Elmar",
  HZB: "HZB",
  HOENDERLOO: "ZVOS",
  FELLOWZORG: "FellowZorg",
  ITFIN: "ITFin",
  INTERIMFINANCE: "IFS",
  JMZ: "JMZ",
  LAGELANDENZORG: "LLZ",
  LAURIER: "Laurier",
  MUNTMASTERS: "MUNTMasters",
  MAANLANDER: "Maanlander",
  MAZAZORG: "MazaZorg",
  MOSKEE_ELFATH: "ElFath",
  MOSKEE_TAWHEED: "Tawheed",
  NLE_AUTOMOTIVE: "NLEAutomotive",
  NIJKERK: "Nijkerk",
  QWIC: "Qwic",
  QWICK: "Qwic",
  RAJATHUISZORG: "RajaThuisZorg",
  TRC: "TRC",
  THEFUTURECOMPANY: "TFC",
  VALWKS: "VALWKS",
  VOLOPZORG: "VolOpZorg",
  ZVOS: "ZVOS",
  ZONNESCHIJNZORG: "Zonneschijnzorg",
  ZORGKOMPAS: "Zorgkompas",
  HETZORGKOMPAS: "Zorgkompas",
  WEBMOLEN: "Webmolen",
  SAMEN100CARE: "Samen100Care",
  TELT: "Telt",
  NANO: "Nano",
  NEXUS: "Nexus",
  IWDZ: "IWDZ",
  FLEXNED: "Flexned",
  DVA: "DVA",
  "MUNT MASTERS": "MUNTMasters",
  "LAGE LANDEN ZORG": "LLZ",
  "DIRECT WERK": "DirectWerk",
  "VOL OP ZORG": "VolOpZorg",
  "NLE AUTOMOTIVE": "NLEAutomotive",
};

function resolveCompanyKey(csvName: string): string | null {
  const upper = csvName.toUpperCase().trim();
  return csvToCompanyKey[upper] || null;
}

async function main() {
  console.log("Seeding database with CSV data...");

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

  const voorganger = await prisma.user.upsert({
    where: { email: "voorganger@itfin.nl" },
    update: {},
    create: {
      email: "voorganger@itfin.nl",
      name: "Voorganger",
      password: hashedPassword,
      role: "USER",
      isActive: false,
    },
  });
  console.log("Created voorganger user:", voorganger.email);

  // ── Companies ──
  const companyIds: Record<string, string> = {};
  for (const [key, info] of Object.entries(companyMap)) {
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
    companyIds[key] = company.id;
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

  // ── Import Tickets from CSV ──
  const ticketsCsvPath = join(__dirname, "../itflow-tickets (1).csv");
  let ticketCount = 0;
  let ticketTimeEntryCount = 0;

  if (existsSync(ticketsCsvPath)) {
    const ticketsCsv = readFileSync(ticketsCsvPath, "utf-8");
    const ticketRows = parseCsv(ticketsCsv);
    console.log(`Found ${ticketRows.length} ticket rows in CSV`);

    // Collect contacts per company
    const contactsMap = new Map<string, Set<string>>();
    for (const row of ticketRows) {
      const contactName = cleanField(row.contact);
      const companyKey = resolveCompanyKey(row.company);
      if (contactName && companyKey && companyIds[companyKey]) {
        const cId = companyIds[companyKey];
        if (!contactsMap.has(cId)) contactsMap.set(cId, new Set());
        contactsMap.get(cId)!.add(contactName);
      }
    }

    // Create contacts
    const portalPassword = await hash("portal123", 10);
    const contactIds = new Map<string, string>(); // "companyId:name" -> contactId
    let portalContactCount = 0;
    for (const [cId, names] of contactsMap) {
      let first = true;
      for (const name of names) {
        // Generate a simple email for the first contact per company (portal-enabled)
        const company = await prisma.company.findUnique({
          where: { id: cId },
          select: { shortName: true },
        });
        const email =
          first && company
            ? `${name.toLowerCase().replace(/\s+/g, ".")}@${company.shortName.toLowerCase()}.nl`
            : null;

        const contact = await prisma.contact.create({
          data: {
            companyId: cId,
            name,
            email,
            isPrimary: first,
            password: email ? portalPassword : null,
            portalEnabled: !!email,
          },
        });
        contactIds.set(`${cId}:${name}`, contact.id);
        if (email) portalContactCount++;
        first = false;
      }
    }
    console.log(
      `Created ${contactIds.size} contacts (${portalContactCount} portal-enabled)`,
    );

    // Import tickets
    for (const row of ticketRows) {
      const companyKey = resolveCompanyKey(row.company);
      if (!companyKey || !companyIds[companyKey]) {
        console.warn(`  Skipping ticket - unknown company: ${row.company}`);
        continue;
      }
      const cId = companyIds[companyKey];
      const subject = row.subject?.trim();
      if (!subject) continue;

      const createdAt = parseDate(row.createdAt) || new Date();
      const resolvedAtDate = parseDate(row.resolvedAt);

      const status = (
        ["OPEN", "CLOSED", "WAITING", "IN_PROGRESS", "RESOLVED"].includes(
          row.status,
        )
          ? row.status
          : "OPEN"
      ) as "OPEN" | "CLOSED" | "WAITING" | "IN_PROGRESS" | "RESOLVED";

      const priority = (
        ["LOW", "NORMAL", "HIGH", "URGENT"].includes(row.priority)
          ? row.priority
          : "NORMAL"
      ) as "LOW" | "NORMAL" | "HIGH" | "URGENT";

      const category = (
        ["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"].includes(
          row.category,
        )
          ? row.category
          : null
      ) as "HARDWARE" | "SOFTWARE" | "NETWORK" | "ACCOUNT" | "OTHER" | null;

      // Determine assigned user
      const assignedToId =
        row.assignedTo?.trim() === "Voorganger" ? voorganger.id : admin.id;

      // Contact
      const contactName = cleanField(row.contact);
      const contactId = contactName
        ? contactIds.get(`${cId}:${contactName}`) || null
        : null;

      const resolvedAt =
        status === "RESOLVED" || status === "CLOSED"
          ? resolvedAtDate || new Date(createdAt.getTime() + 86400000)
          : undefined;
      const closedAt =
        status === "CLOSED"
          ? resolvedAtDate || new Date(createdAt.getTime() + 2 * 86400000)
          : undefined;

      const ticket = await prisma.ticket.create({
        data: {
          companyId: cId,
          contactId,
          subject: subject.substring(0, 255),
          description: cleanField(row.description) || subject,
          status,
          priority,
          category,
          assignedToId,
          createdById: admin.id,
          tasksPerformed: cleanField(row.tasksPerformed),
          pcName: cleanField(row.pcName),
          serialNumber: cleanField(row.serialNumber),
          pendingTasks: cleanField(row.pendingTasks),
          equipmentTaken: cleanField(row.equipmentTaken),
          createdAt,
          resolvedAt,
          closedAt,
        },
      });

      // Create time entry if hours present
      const hours = parseFloat(row.hours || "0");
      if (hours > 0) {
        await prisma.timeEntry.create({
          data: {
            ticketId: ticket.id,
            companyId: cId,
            userId: assignedToId,
            date: createdAt,
            hours,
            description: cleanField(row.tasksPerformed) || subject,
            billable: true,
          },
        });
        ticketTimeEntryCount++;
      }

      ticketCount++;
    }
  } else {
    console.log("Tickets CSV not found, skipping...");
  }

  console.log(`Seeded ${ticketCount} tickets`);
  console.log(`Seeded ${ticketTimeEntryCount} time entries from tickets`);

  // ── Import Time Entries from CSV ──
  const timeCsvPath = join(__dirname, "../itflow-time-entries.csv");
  let timeEntryCount = 0;

  if (existsSync(timeCsvPath)) {
    const timeCsv = readFileSync(timeCsvPath, "utf-8");
    const timeRows = parseCsv(timeCsv);
    console.log(`Found ${timeRows.length} time entry rows in CSV`);

    for (const row of timeRows) {
      const companyKey = resolveCompanyKey(row.company);
      if (!companyKey || !companyIds[companyKey]) {
        console.warn(`  Skipping time entry - unknown company: ${row.company}`);
        continue;
      }
      const cId = companyIds[companyKey];
      const hours = parseFloat(row.hours || "0");
      if (hours <= 0) continue;

      const entryDate = parseDate(row.date);
      if (!entryDate) {
        console.warn(`  Skipping time entry - bad date: ${row.date}`);
        continue;
      }

      await prisma.timeEntry.create({
        data: {
          companyId: cId,
          userId: admin.id,
          date: entryDate,
          hours,
          description: cleanField(row.description) || "Werkzaamheden",
          billable: true,
        },
      });
      timeEntryCount++;
    }
  } else {
    console.log("Time entries CSV not found, skipping...");
  }

  console.log(`Seeded ${timeEntryCount} time entries from CSV`);
  console.log(
    `\nTotal: ${ticketCount} tickets, ${ticketTimeEntryCount + timeEntryCount} time entries`,
  );
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
