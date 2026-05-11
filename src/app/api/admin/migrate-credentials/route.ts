/**
 * Eenmalige migratie: credential-achtige ticketnotities → wachtwoorden vault
 * POST /api/admin/migrate-credentials
 * Alleen voor admins. Droog uitvoeren met ?dry=1
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-utils";
import { encrypt } from "@/lib/crypto";

// Patronen die wijzen op credentials in een notitie
const CREDENTIAL_PATTERNS = [
  /login/i,
  /wachtwoord/i,
  /password/i,
  /ww\s*:/i,
  /pincode/i,
  /pin\s*:/i,
  /icloud/i,
  /apple\s*id/i,
  /microsoft/i,
  /office\s*365/i,
  /router/i,
  /wifi/i,
  /wi-fi/i,
  /inlog/i,
  /toegang/i,
];

function looksLikeCredential(content: string): boolean {
  return CREDENTIAL_PATTERNS.some(p => p.test(content));
}

/**
 * Probeer gebruikersnaam en wachtwoord te parsen uit een notitie.
 * Verwacht formaat:
 *   Label: waarde
 *   gebruiker: x@y.com
 *   ww: Abc123
 */
function parseNote(content: string): {
  label: string;
  username: string | null;
  password: string;
  notes: string;
} | null {
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

  let label = lines[0] || "Migrated credential";
  let username: string | null = null;
  let password: string | null = null;
  const extraLines: string[] = [];

  for (const line of lines.slice(1)) {
    const lower = line.toLowerCase();
    const val = line.split(/:(.+)/)[1]?.trim() || "";

    if (/^(gebruiker|user|e-mail|email|login|inlog|apple\s*id|microsoft\s*account)\s*:/i.test(line)) {
      username = val || null;
    } else if (/^(wachtwoord|password|ww|pin|pincode|code)\s*:/i.test(line)) {
      password = val || null;
    } else if (lower.includes("@") && !username) {
      // Losse e-mailadres op eigen regel
      username = line;
    } else if (
      // Raden: alleenstaande regel die eruit ziet als een wachtwoord
      !password &&
      line.length >= 4 &&
      line.length <= 60 &&
      !line.includes(" ") &&
      /[A-Z]/.test(line) &&
      /[0-9!@#$%^&*]/.test(line)
    ) {
      password = line;
    } else {
      extraLines.push(line);
    }
  }

  // Als label er zelfstandig uitziet (bijv. "iCloud login:") strip de dubbele punt
  label = label.replace(/:$/, "").trim();

  if (!password) return null; // Geen wachtwoord gevonden, skip

  return {
    label,
    username,
    password,
    notes: extraLines.join("\n"),
  };
}

export async function POST(request: NextRequest) {
  let user;
  try { user = await requireAdmin(); } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dry = request.nextUrl.searchParams.get("dry") === "1";

  // Haal alle ticket notities op
  const notes = await prisma.ticketNote.findMany({
    include: {
      ticket: {
        select: { id: true, ticketNumber: true, subject: true, companyId: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const migrated: Array<{
    noteId: string;
    ticketNumber: number;
    subject: string;
    label: string;
    username: string | null;
    status: "migrated" | "skipped" | "no_password";
  }> = [];

  for (const note of notes) {
    if (!looksLikeCredential(note.content)) continue;

    const parsed = parseNote(note.content);

    if (!parsed) {
      migrated.push({
        noteId: note.id,
        ticketNumber: note.ticket.ticketNumber,
        subject: note.ticket.subject,
        label: note.content.split("\n")[0].slice(0, 50),
        username: null,
        status: "no_password",
      });
      continue;
    }

    if (!dry) {
      try {
        await prisma.credential.create({
          data: {
            companyId: note.ticket.companyId,
            ticketId: note.ticket.id,
            label: parsed.label,
            username: parsed.username,
            password: encrypt(parsed.password),
            notes: parsed.notes || null,
            createdById: user.id,
          },
        });

        // Vervang de notitie-inhoud door een verwijzing
        await prisma.ticketNote.update({
          where: { id: note.id },
          data: {
            content: `🔑 Wachtwoord verplaatst naar de wachtwoorden vault van het bedrijf.\n(${parsed.label})`,
          },
        });

        migrated.push({
          noteId: note.id,
          ticketNumber: note.ticket.ticketNumber,
          subject: note.ticket.subject,
          label: parsed.label,
          username: parsed.username,
          status: "migrated",
        });
      } catch {
        migrated.push({
          noteId: note.id,
          ticketNumber: note.ticket.ticketNumber,
          subject: note.ticket.subject,
          label: parsed.label,
          username: parsed.username,
          status: "skipped",
        });
      }
    } else {
      migrated.push({
        noteId: note.id,
        ticketNumber: note.ticket.ticketNumber,
        subject: note.ticket.subject,
        label: parsed.label,
        username: parsed.username,
        status: "migrated",
      });
    }
  }

  return NextResponse.json({
    dry,
    total: migrated.length,
    migrated: migrated.filter(m => m.status === "migrated").length,
    skipped: migrated.filter(m => m.status === "skipped").length,
    no_password: migrated.filter(m => m.status === "no_password").length,
    items: migrated,
  });
}
