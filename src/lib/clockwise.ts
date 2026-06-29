// Genereert het Clockwise plak-format uit een dagafsluiting.
//
// Drie regels per dag:
//   regel 1 = totaal netto uren, bv. "7.25"
//   regel 2 = tijdrange "start : eind", waarbij eind = start + netto totaal
//             (GEEN pauze-gat), uur zonder leading zero, bv. "10:00 : 17:15"
//   regel 3 = verdeling: "Code: uren omschrijving" per klant, gescheiden door " | "
//
// Netto is de enige waarheid: pauze wordt nergens opgeslagen of getoond.
// Dit raakt de Clockd v2 -> Syntess pipeline NIET; het levert alleen de tekst
// die in Clockwise geplakt wordt.

export interface ClockwiseEntry {
  /** Clockwise-code van de klant, bv. "Elmar" */
  code: string;
  /** Uren in stappen van 0.25 */
  hours: number;
  /** Omschrijving van de werkzaamheden */
  description: string;
}

export interface ClockwiseInput {
  /** Begintijd van de werkdag, "HH:MM" */
  start: string;
  /** Verdeling van de netto-uren over de klanten */
  entries: ClockwiseEntry[];
}

export interface ClockwiseFormat {
  /** Regel 1: totaal netto uren, bv. "7.25" */
  total: string;
  /** Regel 2: tijdrange, bv. "10:00 : 17:15" */
  range: string;
  /** Regel 3: verdeling-regel */
  distribution: string;
  /** De drie regels als tuple */
  lines: [string, string, string];
  /** De drie regels samengevoegd met newlines */
  text: string;
}

/**
 * Formatteert uren volgens de plak-regels:
 * - stappen van 0.25 (snapt naar het dichtstbijzijnde kwartier)
 * - decimaalpunt
 * - GEEN trailing nul: 1 niet 1.0, 5.25 blijft 5.25, 7.5 blijft 7.5
 */
export function formatHours(hours: number): string {
  const snapped = Math.round(hours * 4) / 4;
  // Max 2 decimalen, daarna trailing nullen (en een losse punt) strippen.
  return snapped.toFixed(2).replace(/\.?0+$/, "");
}

/** Som van de uren over alle entries (gesnapt op kwartier om floatdrift te vermijden). */
export function sumHours(entries: { hours: number }[]): number {
  const total = entries.reduce((acc, e) => acc + e.hours, 0);
  return Math.round(total * 4) / 4;
}

/** True als een waarde een geheel veelvoud van 0.25 is. */
export function isQuarter(hours: number): boolean {
  return Math.abs(hours * 4 - Math.round(hours * 4)) < 1e-9;
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Formatteert minuten-sinds-middernacht als "H:MM" (uur zonder leading zero). */
function formatTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Bouwt de drie plak-regels. Het totaal is altijd de som van de entries, en het
 * eind van de tijdrange is start + dat totaal (zonder pauze-gat).
 */
export function generateClockwiseFormat(input: ClockwiseInput): ClockwiseFormat {
  const totalHours = sumHours(input.entries);

  const startMin = parseTime(input.start);
  const endMin = startMin + totalHours * 60;

  const total = formatHours(totalHours);
  const range = `${formatTime(startMin)} : ${formatTime(endMin)}`;
  const distribution = input.entries
    .map((e) => `${e.code}: ${formatHours(e.hours)} ${e.description}`.trimEnd())
    .join(" | ");

  return {
    total,
    range,
    distribution,
    lines: [total, range, distribution],
    text: [total, range, distribution].join("\n"),
  };
}
