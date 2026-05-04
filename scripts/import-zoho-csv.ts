import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

function createClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL!;
  const url = new URL(dbUrl);
  const pool = new Pool({
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: url.searchParams.get("sslmode") === "require" ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const prisma = createClient();

// Account ID → Company ID mapping (derived from emails in CSV)
const ACCOUNT_COMPANY_MAP: Record<string, string> = {
  "164117000000532006": "cmmditq57000ebfebieieod6m", // Het Zorg Bureau
  "164117000000531009": "cmmditpyc000bbfeb23lnalei", // Elmar Services
  "164117000000636031": "cmmditpdj0002bfebdqhuh1ks", // Altum TS
  "164117000003328001": "cmmditpyc000bbfeb23lnalei", // Elmar Services (elmarnl.onmicrosoft.com)
};

// Email domain → Company ID fallback
const DOMAIN_COMPANY_MAP: Record<string, string> = {
  "hetzorgbureau.nl": "cmmditq57000ebfebieieod6m",
  "elmarservices.com": "cmmditpyc000bbfeb23lnalei",
  "elmarnl.onmicrosoft.com": "cmmditpyc000bbfeb23lnalei",
  "altum-ts.nl": "cmmditpdj0002bfebdqhuh1ks",
};

const CREATED_BY_ID = "cmmditp690000bfebze8eqx2r"; // Ayoub Elkaoui

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapStatus(status: string): string {
  switch (status.trim()) {
    case "Open": return "OPEN";
    case "Closed": return "CLOSED";
    case "Te facturen": return "BILLABLE";
    default: return "OPEN";
  }
}

function getCompanyId(accountId: string, email: string): string | null {
  if (accountId && ACCOUNT_COMPANY_MAP[accountId]) {
    return ACCOUNT_COMPANY_MAP[accountId];
  }
  if (email) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && DOMAIN_COMPANY_MAP[domain]) {
      return DOMAIN_COMPANY_MAP[domain];
    }
  }
  return null;
}

async function main() {
  const csvPath = path.join(process.cwd(), "Cases__1.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  // Skip header line
  const dataLines = lines.slice(1);

  let imported = 0;
  const skipped: { row: number; subject: string; accountId: string; reason: string }[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const cols = line.split("\t");

    const zohoId = cols[0]?.trim();
    const accountId = cols[1]?.trim() ?? "";
    const email = cols[3]?.trim() ?? "";
    const subject = cols[5]?.trim() ?? "";
    const descriptionRaw = cols[6]?.trim() ?? "";
    const statusRaw = cols[7]?.trim() ?? "Open";
    const createdTime = cols[12]?.trim() ?? "";
    const closedTime = cols[13]?.trim() ?? "";

    if (!subject) continue;

    const companyId = getCompanyId(accountId, email);

    if (!companyId) {
      skipped.push({
        row: i + 2,
        subject,
        accountId: accountId || "(geen)",
        reason: `Account ID '${accountId}' niet herkend, email: '${email}'`,
      });
      continue;
    }

    const description = descriptionRaw ? stripHtml(descriptionRaw) : null;
    const status = mapStatus(statusRaw) as any;

    const createdAt = createdTime ? new Date(createdTime) : new Date();
    const resolvedAt = closedTime ? new Date(closedTime) : null;
    const closedAt = status === "CLOSED" && closedTime ? new Date(closedTime) : null;

    try {
      await prisma.ticket.create({
        data: {
          companyId,
          subject,
          description,
          status,
          priority: "NORMAL",
          category: "OTHER",
          createdById: CREATED_BY_ID,
          createdAt,
          updatedAt: createdAt,
          resolvedAt,
          closedAt,
        },
      });
      imported++;
      console.log(`✓ [${i + 2}] ${subject} → ${status}`);
    } catch (err: any) {
      skipped.push({
        row: i + 2,
        subject,
        accountId,
        reason: `DB fout: ${err.message}`,
      });
    }
  }

  console.log(`\n=== RESULTAAT ===`);
  console.log(`✓ Geïmporteerd: ${imported} tickets`);

  if (skipped.length > 0) {
    console.log(`✗ Overgeslagen: ${skipped.length} tickets\n`);
    for (const s of skipped) {
      console.log(`  Row ${s.row}: "${s.subject}"`);
      console.log(`    Reden: ${s.reason}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
