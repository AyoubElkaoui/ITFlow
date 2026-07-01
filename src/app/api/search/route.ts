import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";
import type { SearchType, SearchResult } from "@/types/search";

// Unified fuzzy search (pg_trgm) over Ticket / KbArticle / Asset / Company / Contact.
// Server-side via $queryRaw met similarity() + ILIKE; geparametriseerd (geen injectie).

// ~90-tekens venster rond de eerste match, zodat ik zie WAAROM iets matcht.
function makeSnippet(text: string | null, q: string): string | null {
  if (!text) return null;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text.length > 90 ? text.slice(0, 90) + "…" : text;
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + q.length + 60);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

function firstMatch(
  q: string,
  fields: { label: string; value: string | null }[],
): { label: string; snippet: string } | null {
  const lower = q.toLowerCase();
  for (const f of fields) {
    if (f.value && f.value.toLowerCase().includes(lower)) {
      return { label: f.label, snippet: makeSnippet(f.value, q)! };
    }
  }
  return null;
}

interface TicketRow {
  id: string;
  ticketNumber: number;
  subject: string;
  tasksPerformed: string | null;
  pcName: string | null;
  serialNumber: string | null;
  officeLicense: string | null;
  companyShort: string | null;
  score: number;
}
interface AssetRow {
  id: string;
  name: string;
  assignedTo: string | null;
  companyShort: string | null;
  score: number;
}
interface CompanyRow {
  id: string;
  name: string;
  shortName: string | null;
  score: number;
}
interface KbRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  score: number;
}
interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  companyShort: string | null;
  score: number;
}

export async function GET(request: NextRequest) {
  try {
    await getSessionUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  const all = request.nextUrl.searchParams.get("all") === "1";
  const limit = all ? 50 : 8;

  const empty = {
    q,
    results: { TICKET: [], KB: [], ASSET: [], CLIENT: [], CONTACT: [] },
  };
  if (q.length < 2) return NextResponse.json(empty);

  // ILIKE-patroon met geëscapete wildcards (waarde-parameter, veilig).
  const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;

  const [tickets, assets, companies, kbs, contacts] = await Promise.all([
    prisma.$queryRaw<TicketRow[]>`
      SELECT t.id, t."ticketNumber", t.subject, t."tasksPerformed", t."pcName",
             t."serialNumber", t."officeLicense", c."shortName" AS "companyShort",
             GREATEST(
               similarity(t.subject, ${q}),
               similarity(coalesce(t."tasksPerformed", ''), ${q}),
               similarity(coalesce(t."pcName", ''), ${q}),
               similarity(coalesce(t."serialNumber", ''), ${q}),
               similarity(coalesce(t."officeLicense", ''), ${q})
             ) AS score
      FROM "Ticket" t
      LEFT JOIN "Company" c ON c.id = t."companyId"
      WHERE t.subject ILIKE ${like}
         OR t."tasksPerformed" ILIKE ${like}
         OR t."pcName" ILIKE ${like}
         OR t."serialNumber" ILIKE ${like}
         OR t."officeLicense" ILIKE ${like}
         OR similarity(t.subject, ${q}) > 0.2
         OR similarity(coalesce(t."serialNumber", ''), ${q}) > 0.25
         OR similarity(coalesce(t."pcName", ''), ${q}) > 0.25
      ORDER BY score DESC, t."ticketNumber" DESC
      LIMIT ${limit}
    `,
    prisma.$queryRaw<AssetRow[]>`
      SELECT a.id, a.name, a."assignedTo", c."shortName" AS "companyShort",
             GREATEST(similarity(a.name, ${q}), similarity(coalesce(a."assignedTo", ''), ${q})) AS score
      FROM "Asset" a
      LEFT JOIN "Company" c ON c.id = a."companyId"
      WHERE a.name ILIKE ${like}
         OR a."assignedTo" ILIKE ${like}
         OR similarity(a.name, ${q}) > 0.2
         OR similarity(coalesce(a."assignedTo", ''), ${q}) > 0.25
      ORDER BY score DESC
      LIMIT ${limit}
    `,
    prisma.$queryRaw<CompanyRow[]>`
      SELECT id, name, "shortName",
             GREATEST(similarity(name, ${q}), similarity(coalesce("shortName", ''), ${q})) AS score
      FROM "Company"
      WHERE name ILIKE ${like}
         OR "shortName" ILIKE ${like}
         OR similarity(name, ${q}) > 0.2
         OR similarity(coalesce("shortName", ''), ${q}) > 0.3
      ORDER BY score DESC
      LIMIT ${limit}
    `,
    prisma.$queryRaw<KbRow[]>`
      SELECT id, title, slug, content,
             GREATEST(similarity(title, ${q}), similarity(content, ${q})) AS score
      FROM "KbArticle"
      WHERE title ILIKE ${like}
         OR content ILIKE ${like}
         OR similarity(title, ${q}) > 0.2
      ORDER BY score DESC
      LIMIT ${limit}
    `,
    prisma.$queryRaw<ContactRow[]>`
      SELECT ct.id, ct.name, ct.email, c."shortName" AS "companyShort",
             GREATEST(similarity(ct.name, ${q}), similarity(coalesce(ct.email, ''), ${q})) AS score
      FROM "Contact" ct
      LEFT JOIN "Company" c ON c.id = ct."companyId"
      WHERE ct.name ILIKE ${like}
         OR ct.email ILIKE ${like}
         OR similarity(ct.name, ${q}) > 0.2
      ORDER BY score DESC
      LIMIT ${limit}
    `,
  ]);

  const results: Record<SearchType, SearchResult[]> = {
    TICKET: tickets.map((t) => {
      const num = `#${String(t.ticketNumber).padStart(3, "0")}`;
      const match = firstMatch(q, [
        { label: "S/N", value: t.serialNumber },
        { label: "PC", value: t.pcName },
        { label: "Licentie", value: t.officeLicense },
        { label: "Taken", value: t.tasksPerformed },
        { label: "Onderwerp", value: t.subject },
      ]);
      return {
        type: "TICKET" as const,
        id: t.id,
        title: `${num} · ${t.subject}`,
        subtitle: t.companyShort,
        snippet: match ? `${match.label}: ${match.snippet}` : null,
        url: `/tickets/${t.id}`,
        score: Number(t.score),
      };
    }),
    KB: kbs.map((k) => ({
      type: "KB" as const,
      id: k.id,
      title: k.title,
      subtitle: null,
      snippet: makeSnippet(k.content, q),
      url: `/kb/${k.slug}`,
      score: Number(k.score),
    })),
    ASSET: assets.map((a) => ({
      type: "ASSET" as const,
      id: a.id,
      title: a.name,
      subtitle: [a.companyShort, a.assignedTo].filter(Boolean).join(" · ") || null,
      snippet:
        a.assignedTo && a.assignedTo.toLowerCase().includes(q.toLowerCase())
          ? `Toegewezen: ${a.assignedTo}`
          : null,
      url: `/assets?search=${encodeURIComponent(a.name)}`,
      score: Number(a.score),
    })),
    CLIENT: companies.map((c) => ({
      type: "CLIENT" as const,
      id: c.id,
      title: c.shortName || c.name,
      subtitle: c.name,
      snippet: null,
      url: `/companies/${c.id}`,
      score: Number(c.score),
    })),
    CONTACT: contacts.map((ct) => ({
      type: "CONTACT" as const,
      id: ct.id,
      title: ct.name,
      subtitle: [ct.companyShort, ct.email].filter(Boolean).join(" · ") || null,
      snippet: null,
      url: `/contacts?search=${encodeURIComponent(ct.name)}`,
      score: Number(ct.score),
    })),
  };

  return NextResponse.json({ q, results });
}
