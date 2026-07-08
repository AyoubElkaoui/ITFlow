// Eén bron voor "wat is open" vs "wat is klaar". Een ticket is klaar zodra het
// gefactureerd kan worden: Opgelost (RESOLVED), Te factureren (BILLABLE) of
// Gesloten (CLOSED) tellen allemaal als klaar. Te factureren = deze set.

export const OPEN_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING"] as const;
export const DONE_STATUSES = ["RESOLVED", "BILLABLE", "CLOSED"] as const;

// Voor querystrings (bv. ?status=RESOLVED,BILLABLE,CLOSED).
export const DONE_STATUS_PARAM = DONE_STATUSES.join(",");
