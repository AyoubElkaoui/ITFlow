// Aggregatie voor het week-/maandoverzicht van de dagafsluiting.
// Pure functies (geen Prisma) zodat ze los te testen zijn; de route levert de
// opgehaalde WorkDays aan.

export interface OverviewCompany {
  id: string;
  shortName: string;
  name: string;
  clockwiseCode: string | null;
}

export interface RawAllocation {
  companyId: string;
  hours: number;
  description: string | null;
  company: OverviewCompany;
}

export interface RawWorkDay {
  date: Date | string;
  status: "OPEN" | "CLOSED";
  netHours: number;
  allocations: RawAllocation[];
}

export interface OverviewDay {
  date: string;
  status: "OPEN" | "CLOSED";
  netHours: number;
  allocatedHours: number;
  balanced: boolean;
}

export interface OverviewClient {
  companyId: string;
  company: OverviewCompany;
  total: number;
  byDate: Record<string, { hours: number; description: string }>;
}

export interface OverviewResult {
  days: OverviewDay[];
  clients: OverviewClient[];
  totals: {
    netHours: number;
    allocatedHours: number;
    closedDays: number;
    openDays: number;
    totalDays: number;
  };
  sanity: {
    ok: boolean;
    netHours: number;
    allocatedHours: number;
    diff: number;
  };
}

// Snap naar kwartier om floatdrift in optellingen te vermijden.
export const q = (n: number) => Math.round(n * 4) / 4;

// WorkDay.date staat als @db.Date (UTC-middernacht); we rekenen in UTC.
export function ymd(date: Date | string): string {
  return (typeof date === "string" ? new Date(date) : date)
    .toISOString()
    .slice(0, 10);
}

export function monthRange(anchor: Date): { from: Date; to: Date } {
  const from = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1),
  );
  const to = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
  );
  return { from, to };
}

export function weekRange(anchor: Date): { from: Date; to: Date } {
  const dow = anchor.getUTCDay(); // 0=zo .. 6=za
  const sinceMonday = (dow + 6) % 7;
  const from = new Date(anchor.getTime() - sinceMonday * 86400000);
  const to = new Date(from.getTime() + 4 * 86400000); // ma..vr
  return { from, to };
}

/** De vijf werkdag-datums (ma..vr) van de week waar `anchor` in valt. */
export function weekdayColumns(anchor: Date): string[] {
  const { from } = weekRange(anchor);
  return Array.from({ length: 5 }, (_, i) =>
    ymd(new Date(from.getTime() + i * 86400000)),
  );
}

export function aggregateOverview(workDays: RawWorkDay[]): OverviewResult {
  const days: OverviewDay[] = [];
  const clients = new Map<string, OverviewClient>();
  let netSum = 0;
  let allocatedSum = 0;
  let closedDays = 0;
  let openDays = 0;
  // Sanity-check rekent alleen over CLOSED dagen: die zijn bij afsluiten al
  // gevalideerd op balans, dus een mismatch wijst op corrupte data. OPEN dagen
  // zijn legitiem nog niet verdeeld en worden apart gemarkeerd.
  let closedNet = 0;
  let closedAllocated = 0;

  for (const wd of workDays) {
    const dstr = ymd(wd.date);
    let dayAllocated = 0;

    for (const a of wd.allocations) {
      dayAllocated += a.hours;
      const row =
        clients.get(a.companyId) ??
        ({
          companyId: a.companyId,
          company: a.company,
          total: 0,
          byDate: {},
        } satisfies OverviewClient);
      row.total = q(row.total + a.hours);
      const cell = row.byDate[dstr];
      row.byDate[dstr] = cell
        ? {
            hours: q(cell.hours + a.hours),
            description: [cell.description, a.description]
              .filter(Boolean)
              .join(", "),
          }
        : { hours: a.hours, description: a.description ?? "" };
      clients.set(a.companyId, row);
    }

    dayAllocated = q(dayAllocated);
    days.push({
      date: dstr,
      status: wd.status,
      netHours: wd.netHours,
      allocatedHours: dayAllocated,
      balanced: dayAllocated === q(wd.netHours),
    });
    netSum += wd.netHours;
    allocatedSum += dayAllocated;
    if (wd.status === "CLOSED") {
      closedDays++;
      closedNet += wd.netHours;
      closedAllocated += dayAllocated;
    } else {
      openDays++;
    }
  }

  netSum = q(netSum);
  allocatedSum = q(allocatedSum);
  closedNet = q(closedNet);
  closedAllocated = q(closedAllocated);

  const clientRows = [...clients.values()].sort((a, b) => b.total - a.total);

  return {
    days,
    clients: clientRows,
    totals: {
      netHours: netSum,
      allocatedHours: allocatedSum,
      closedDays,
      openDays,
      totalDays: workDays.length,
    },
    sanity: {
      ok: closedNet === closedAllocated,
      netHours: closedNet,
      allocatedHours: closedAllocated,
      diff: q(closedAllocated - closedNet),
    },
  };
}
