// Auto-sync: elke afgeronde werk-tijd (TicketTimeLog) wordt 1-op-1 een facturabele
// TimeEntry. Zo verschijnt werk dat via de Start/Stop-timer of "Handmatig toevoegen"
// op een ticket is geregistreerd óók op de Uren-pagina (/time) en in de rapporten —
// die lezen namelijk TimeEntry, niet TicketTimeLog.
//
// De koppeling loopt via TimeEntry.sourceLogId (uniek), waardoor de sync idempotent
// upsert en werk-tijd nooit dubbel telt. Dagafsluiting blijft de rauwe TicketTimeLog
// lezen en staat hier los van.

import type { Prisma } from "@/generated/prisma/client";
import { zonedYmd } from "@/lib/tz";

// Werkt op de transactie-client zodat de sync in dezelfde transactie draait als de
// log-mutatie die 'm triggert (alles slaagt of niets).
type Tx = Prisma.TransactionClient;

// Genoeg van een TicketTimeLog om een TimeEntry af te leiden.
interface SyncableLog {
  id: string;
  ticketId: string;
  userId: string;
  startedAt: Date;
  minutes: number | null;
  note: string | null;
}

// Rauwe minuten -> uren, ALTIJD naar boven afgerond op een kwartier (Clockwise-
// eenheid): we werken in kwartieren, dus ook 5 minuten telt als 0,25u. Minimaal
// 0,25u (TimeEntry.hours moet > 0 zijn).
export function minutesToBillableHours(minutes: number): number {
  return Math.max(0.25, Math.ceil((minutes / 60) * 4) / 4);
}

/**
 * Upsert een facturabele TimeEntry voor een afgeronde werk-tijd-log. Doet niets als de
 * log nog loopt (minutes == null) of het ticket verdwenen is.
 */
export async function syncTimeEntryFromLog(
  tx: Tx,
  log: SyncableLog,
): Promise<void> {
  if (log.minutes == null || log.minutes <= 0) return;

  const ticket = await tx.ticket.findUnique({
    where: { id: log.ticketId },
    select: { companyId: true },
  });
  if (!ticket) return;

  const hours = minutesToBillableHours(log.minutes);
  // Kalenderdag in NL-tijd -> UTC-middernacht voor de @db.Date-kolom.
  const date = new Date(`${zonedYmd(log.startedAt)}T00:00:00Z`);

  await tx.timeEntry.upsert({
    where: { sourceLogId: log.id },
    create: {
      sourceLogId: log.id,
      ticketId: log.ticketId,
      companyId: ticket.companyId,
      userId: log.userId,
      date,
      hours,
      description: log.note,
      billable: true,
    },
    update: {
      // Klant/gebruiker kunnen niet wijzigen; uren, dag en omschrijving wel.
      date,
      hours,
      description: log.note,
    },
  });
}

/**
 * Verwijder de afgeleide TimeEntry van een werk-tijd-log (bij verwijderen van de log).
 */
export async function deleteTimeEntryForLog(
  tx: Tx,
  logId: string,
): Promise<void> {
  await tx.timeEntry.deleteMany({ where: { sourceLogId: logId } });
}
