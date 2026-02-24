import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import { readFileSync } from "fs";
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

// ── Types for JSON seed data ──
interface SeedCompany {
  name: string;
  shortName: string;
  hourlyRate: number;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  isActive?: boolean;
}

interface SeedContact {
  company: string; // shortName
  name: string;
  email?: string;
  phone?: string;
  function?: string;
}

interface SeedTicket {
  company: string; // shortName
  subject: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  assignedTo?: string;
  contact?: string;
  tasksPerformed?: string;
  pcName?: string;
  serialNumber?: string;
  officeLicense?: string;
  pendingTasks?: string;
  equipmentTaken?: string;
  createdAt?: string;
  resolvedAt?: string;
}

interface SeedTimeEntry {
  company: string; // shortName
  date: string;
  hours: number;
  description?: string;
  billable?: boolean;
  user?: string;
  ticket?: string;
}

interface SeedAsset {
  company: string; // shortName
  type: string;
  name: string;
  status: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyEnd?: string;
  assignedTo?: string;
  notes?: string;
}

interface SeedAssetTicketLink {
  assetName: string;
  ticket: string; // ticket subject
  company: string; // shortName
  note?: string;
}

interface SeedData {
  companies: SeedCompany[];
  contacts: SeedContact[];
  tickets: SeedTicket[];
  timeEntries: SeedTimeEntry[];
  assets: SeedAsset[];
  assetTicketLinks: SeedAssetTicketLink[];
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const s = dateStr.trim();
  if (!s) return null;
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

function emptyToNull(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed === "" ? null : trimmed;
}

async function main() {
  console.log("Seeding database from seed_final_complete.json...");

  // ── Load seed data ──
  const seedPath = join(__dirname, "../seed_final_complete.json");
  const seedData: SeedData = JSON.parse(readFileSync(seedPath, "utf-8"));

  // ── Merge jan2026 data if available ──
  const jan2026Path = join(__dirname, "../jan2026_data (1).json");
  try {
    const jan2026Raw = readFileSync(jan2026Path, "utf-8");
    const jan2026: { tickets?: SeedTicket[]; timeEntries?: SeedTimeEntry[] } = JSON.parse(jan2026Raw);
    if (jan2026.tickets) {
      // Filter to only Jan 2026+ tickets that aren't already in seed data
      const existingSubjects = new Set(seedData.tickets.map((t) => `${t.company}:${t.subject}`));
      const newTickets = jan2026.tickets.filter((t) => !existingSubjects.has(`${t.company}:${t.subject}`));
      seedData.tickets.push(...newTickets);
      console.log(`Merged ${newTickets.length} new tickets from jan2026_data`);
    }
    if (jan2026.timeEntries) {
      // Filter to only Jan 2026 time entries (seed_final_complete already has Feb+)
      const newEntries = jan2026.timeEntries.filter((te) => te.date && te.date.startsWith("2026-01"));
      seedData.timeEntries.push(...newEntries);
      console.log(`Merged ${newEntries.length} January time entries from jan2026_data`);
    }
  } catch {
    console.log("No jan2026_data file found, skipping merge");
  }

  // ── Ensure ITFin company exists (used in tickets/time entries but may not be in companies array) ──
  const hasITFin = seedData.companies.some((c) => c.shortName === "ITFin");
  if (!hasITFin) {
    seedData.companies.push({
      name: "ITFin",
      shortName: "ITFin",
      hourlyRate: 0,
      email: "",
      phone: "",
      website: "",
      isActive: true,
    });
  }

  // ── Ensure MoskeeTawhid company exists ──
  const hasMoskeeTawhid = seedData.companies.some((c) => c.shortName === "MoskeeTawhid");
  if (!hasMoskeeTawhid) {
    seedData.companies.push({
      name: "Moskee Tawhid",
      shortName: "MoskeeTawhid",
      hourlyRate: 75,
      email: "",
      phone: "",
      website: "",
      isActive: true,
    });
  }

  console.log(`Loaded: ${seedData.companies.length} companies, ${seedData.contacts.length} contacts, ${seedData.tickets.length} tickets, ${seedData.timeEntries.length} time entries, ${seedData.assets.length} assets, ${seedData.assetTicketLinks.length} asset-ticket links`);

  // ── Cleanup existing data ──
  console.log("Cleaning existing data...");
  await prisma.projectTask.deleteMany();
  await prisma.project.deleteMany();
  await prisma.activeTimer.deleteMany();
  await prisma.ticketNote.deleteMany();
  await prisma.assetTicket.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.recurringTicket.deleteMany();
  await prisma.customFieldValue.deleteMany();
  await prisma.customFieldDefinition.deleteMany();
  await prisma.kbArticle.deleteMany();
  await prisma.kbCategory.deleteMany();
  await prisma.slaPolicy.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  console.log("Cleaned all existing data");

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

  const userMap: Record<string, string> = {
    Ayoub: admin.id,
    Voorganger: voorganger.id,
  };

  // ── Companies ──
  const companyIds: Record<string, string> = {}; // shortName -> id
  for (const c of seedData.companies) {
    const company = await prisma.company.upsert({
      where: { shortName: c.shortName },
      update: {},
      create: {
        name: c.name,
        shortName: c.shortName,
        hourlyRate: c.hourlyRate,
        email: emptyToNull(c.email),
        phone: emptyToNull(c.phone),
        website: emptyToNull(c.website),
        address: emptyToNull(c.address),
        contactPerson: emptyToNull(c.contactPerson),
        contactEmail: emptyToNull(c.contactEmail),
        contactPhone: emptyToNull(c.contactPhone),
        notes: emptyToNull(c.notes),
        isActive: c.isActive !== false,
      },
    });
    companyIds[c.shortName] = company.id;
  }
  console.log(`Seeded ${Object.keys(companyIds).length} companies`);

  // ── SLA Policies ──
  const slaPolicies = [
    { name: "Urgent SLA", priority: "URGENT" as const, responseTimeHours: 1, resolveTimeHours: 4 },
    { name: "High SLA", priority: "HIGH" as const, responseTimeHours: 4, resolveTimeHours: 8 },
    { name: "Normal SLA", priority: "NORMAL" as const, responseTimeHours: 8, resolveTimeHours: 24 },
    { name: "Low SLA", priority: "LOW" as const, responseTimeHours: 24, resolveTimeHours: 72 },
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
    { name: "Handleidingen", slug: "handleidingen", icon: "BookOpen", sortOrder: 1 },
    { name: "Troubleshooting", slug: "troubleshooting", icon: "Wrench", sortOrder: 2 },
    { name: "Netwerk", slug: "netwerk", icon: "Wifi", sortOrder: 3 },
    { name: "Beveiliging", slug: "beveiliging", icon: "Shield", sortOrder: 4 },
    { name: "Procedures", slug: "procedures", icon: "ClipboardList", sortOrder: 5 },
  ];
  for (const cat of kbCategories) {
    await prisma.kbCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`Seeded ${kbCategories.length} KB categories`);

  // ── Contacts ──
  const portalPassword = await hash("portal123", 10);
  const contactIds = new Map<string, string>(); // "companyShortName:contactName" -> contactId
  const primaryPerCompany = new Set<string>(); // track which companies already have a primary

  for (const c of seedData.contacts) {
    const cId = companyIds[c.company];
    if (!cId) {
      console.warn(`  Skipping contact "${c.name}" - unknown company: ${c.company}`);
      continue;
    }

    const email = emptyToNull(c.email);
    const isPrimary = !primaryPerCompany.has(c.company);
    if (isPrimary) primaryPerCompany.add(c.company);

    const contact = await prisma.contact.create({
      data: {
        companyId: cId,
        name: c.name,
        email,
        phone: emptyToNull(c.phone),
        function: emptyToNull(c.function),
        isPrimary,
        portalEnabled: isPrimary && !!email,
        password: isPrimary && email ? portalPassword : null,
      },
    });
    contactIds.set(`${c.company}:${c.name}`, contact.id);
  }
  console.log(`Seeded ${contactIds.size} contacts`);

  // ── Assets ──
  const assetIds = new Map<string, string>(); // "companyShortName:assetName" -> assetId
  const seenAssetTags = new Set<string>();
  for (const a of seedData.assets) {
    const cId = companyIds[a.company];
    if (!cId) {
      console.warn(`  Skipping asset "${a.name}" - unknown company: ${a.company}`);
      continue;
    }
    const tag = emptyToNull(a.name);
    if (tag && seenAssetTags.has(tag)) {
      console.warn(`  Skipping duplicate asset tag: ${tag}`);
      continue;
    }
    if (tag) seenAssetTags.add(tag);

    const asset = await prisma.asset.create({
      data: {
        companyId: cId,
        type: a.type as "LAPTOP" | "DESKTOP" | "PRINTER" | "MONITOR" | "PHONE" | "NETWORK" | "OTHER",
        name: emptyToNull(a.name),
        assetTag: emptyToNull(a.name),
        brand: emptyToNull(a.brand),
        model: emptyToNull(a.model),
        serialNumber: emptyToNull(a.serialNumber),
        purchaseDate: parseDate(a.purchaseDate),
        warrantyEnd: parseDate(a.warrantyEnd),
        assignedTo: emptyToNull(a.assignedTo),
        status: a.status as "ACTIVE" | "IN_REPAIR" | "STORED" | "RETIRED",
        notes: emptyToNull(a.notes),
      },
    });
    assetIds.set(`${a.company}:${a.name}`, asset.id);
  }
  console.log(`Seeded ${assetIds.size} assets`);

  // ── Tickets ──
  const ticketMap = new Map<string, string>(); // "companyShortName:subject" -> ticketId
  let ticketCount = 0;

  for (const t of seedData.tickets) {
    const cId = companyIds[t.company];
    if (!cId) {
      console.warn(`  Skipping ticket "${t.subject}" - unknown company: ${t.company}`);
      continue;
    }

    const createdAt = parseDate(t.createdAt) || new Date();
    const resolvedAtDate = parseDate(t.resolvedAt);

    const statusMap: Record<string, string> = {
      OPEN: "OPEN", CLOSED: "CLOSED", WAITING: "WAITING",
      IN_PROGRESS: "IN_PROGRESS", RESOLVED: "RESOLVED", BILLABLE: "BILLABLE",
      TE_FACTUREREN: "BILLABLE",
    };
    const status = (statusMap[t.status] || "OPEN") as "OPEN" | "CLOSED" | "WAITING" | "IN_PROGRESS" | "RESOLVED" | "BILLABLE";

    const priorityMap: Record<string, string> = {
      LOW: "LOW", low: "LOW", Low: "LOW",
      NORMAL: "NORMAL", normal: "NORMAL", Normal: "NORMAL",
      MEDIUM: "NORMAL", medium: "NORMAL", Medium: "NORMAL",
      HIGH: "HIGH", high: "HIGH", High: "HIGH",
      URGENT: "URGENT", urgent: "URGENT", Urgent: "URGENT",
    };
    const priority = (priorityMap[t.priority] || "NORMAL") as "LOW" | "NORMAL" | "HIGH" | "URGENT";

    const category = (
      ["HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"].includes(t.category || "")
        ? t.category
        : null
    ) as "HARDWARE" | "SOFTWARE" | "NETWORK" | "ACCOUNT" | "OTHER" | null;

    const assignedToId = t.assignedTo ? (userMap[t.assignedTo] || admin.id) : admin.id;

    const contactId = t.contact
      ? contactIds.get(`${t.company}:${t.contact}`) || null
      : null;

    const resolvedAt =
      status === "RESOLVED" || status === "CLOSED" || status === "BILLABLE"
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
        subject: t.subject.substring(0, 255),
        description: emptyToNull(t.description) || t.subject,
        status,
        priority,
        category,
        assignedToId,
        createdById: admin.id,
        tasksPerformed: emptyToNull(t.tasksPerformed),
        pcName: emptyToNull(t.pcName),
        serialNumber: emptyToNull(t.serialNumber),
        officeLicense: emptyToNull(t.officeLicense),
        pendingTasks: emptyToNull(t.pendingTasks),
        equipmentTaken: emptyToNull(t.equipmentTaken),
        createdAt,
        resolvedAt,
        closedAt,
      },
    });

    ticketMap.set(`${t.company}:${t.subject}`, ticket.id);
    ticketCount++;
  }
  console.log(`Seeded ${ticketCount} tickets`);

  // ── Time Entries ──
  let timeEntryCount = 0;
  for (const te of seedData.timeEntries) {
    const cId = companyIds[te.company];
    if (!cId) {
      console.warn(`  Skipping time entry - unknown company: ${te.company}`);
      continue;
    }

    const entryDate = parseDate(te.date);
    if (!entryDate) {
      console.warn(`  Skipping time entry - bad date: ${te.date}`);
      continue;
    }

    const hours = te.hours;
    if (hours <= 0 || hours > 24) {
      console.warn(`  Skipping time entry - invalid hours: ${hours}`);
      continue;
    }

    const userId = te.user ? (userMap[te.user] || admin.id) : admin.id;

    // Try to link to a ticket by subject match
    let ticketId: string | null = null;
    if (te.ticket) {
      ticketId = ticketMap.get(`${te.company}:${te.ticket}`) || null;
    }

    await prisma.timeEntry.create({
      data: {
        companyId: cId,
        userId,
        ticketId,
        date: entryDate,
        hours,
        description: emptyToNull(te.description) || "Werkzaamheden",
        billable: te.billable !== false,
      },
    });
    timeEntryCount++;
  }
  console.log(`Seeded ${timeEntryCount} time entries`);

  // ── Asset-Ticket Links ──
  let assetTicketLinkCount = 0;
  for (const link of seedData.assetTicketLinks) {
    const assetId = assetIds.get(`${link.company}:${link.assetName}`);
    const ticketId = ticketMap.get(`${link.company}:${link.ticket}`);

    if (!assetId) {
      console.warn(`  Skipping asset-ticket link - asset not found: "${link.assetName}" in ${link.company}`);
      continue;
    }
    if (!ticketId) {
      console.warn(`  Skipping asset-ticket link - ticket not found: "${link.ticket}" in ${link.company}`);
      continue;
    }

    await prisma.assetTicket.create({
      data: {
        assetId,
        ticketId,
        note: emptyToNull(link.note),
      },
    });
    assetTicketLinkCount++;
  }
  console.log(`Seeded ${assetTicketLinkCount} asset-ticket links`);

  // ── Summary ──
  console.log("\n=== Seed Summary ===");
  console.log(`Companies:          ${Object.keys(companyIds).length}`);
  console.log(`Contacts:           ${contactIds.size}`);
  console.log(`Assets:             ${assetIds.size}`);
  console.log(`Tickets:            ${ticketCount}`);
  console.log(`Time Entries:       ${timeEntryCount}`);
  console.log(`Asset-Ticket Links: ${assetTicketLinkCount}`);
  console.log(`SLA Policies:       ${slaPolicies.length}`);
  console.log(`KB Categories:      ${kbCategories.length}`);
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
