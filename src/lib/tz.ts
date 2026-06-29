// Tijdzone-helpers. De dagafsluiting werkt op kalenderdagen in mijn lokale tijd
// (Nederland), terwijl timestamps (zoals Ticket.createdAt) in UTC staan. Deze
// helper rekent een kalenderdag om naar het juiste UTC-venster, ongeacht de
// tijdzone van de server (lokaal Amsterdam, op Vercel UTC).

export const APP_TIME_ZONE = "Europe/Amsterdam";

// Offset (in ms) van een moment in `timeZone` t.o.v. UTC.
function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>(
    (acc, p) => {
      acc[p.type] = p.value;
      return acc;
    },
    {},
  );
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // Intl kan "24" teruggeven op middernacht; normaliseer naar 0.
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - date.getTime();
}

/**
 * Geeft het UTC-venster [start, end) dat overeenkomt met de volledige kalenderdag
 * `dateParam` ("YYYY-MM-DD") in `timeZone`.
 */
export function zonedDayRange(
  dateParam: string,
  timeZone: string = APP_TIME_ZONE,
): { start: Date; end: Date } {
  const guess = new Date(`${dateParam}T00:00:00Z`);
  const start = new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
  const endGuess = new Date(guess.getTime() + 24 * 60 * 60 * 1000);
  const end = new Date(endGuess.getTime() - tzOffsetMs(endGuess, timeZone));
  return { start, end };
}
