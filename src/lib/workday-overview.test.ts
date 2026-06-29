import { describe, it, expect } from "vitest";
import {
  aggregateOverview,
  monthRange,
  weekRange,
  weekdayColumns,
  ymd,
  type RawWorkDay,
  type OverviewCompany,
} from "./workday-overview";

const elmar: OverviewCompany = {
  id: "c-elmar",
  shortName: "ElmarServices",
  name: "Elmar Services",
  clockwiseCode: "Elmar",
};
const altum: OverviewCompany = {
  id: "c-altum",
  shortName: "AltumTS",
  name: "Altum",
  clockwiseCode: "Altum",
};
const rtz: OverviewCompany = {
  id: "c-rtz",
  shortName: "RTZ",
  name: "RTZ",
  clockwiseCode: null,
};

function day(
  date: string,
  status: "OPEN" | "CLOSED",
  netHours: number,
  allocs: Array<[OverviewCompany, number, string]>,
): RawWorkDay {
  return {
    date: new Date(`${date}T00:00:00Z`),
    status,
    netHours,
    allocations: allocs.map(([company, hours, description]) => ({
      companyId: company.id,
      hours,
      description,
      company,
    })),
  };
}

describe("date ranges", () => {
  it("computes a full month", () => {
    const { from, to } = monthRange(new Date("2026-06-15T00:00:00Z"));
    expect(ymd(from)).toBe("2026-06-01");
    expect(ymd(to)).toBe("2026-06-30");
  });

  it("computes Mon..Fri of the week (anchor mid-week)", () => {
    // 2026-06-24 is a Wednesday
    const { from, to } = weekRange(new Date("2026-06-24T00:00:00Z"));
    expect(ymd(from)).toBe("2026-06-22"); // Monday
    expect(ymd(to)).toBe("2026-06-26"); // Friday
  });

  it("week anchored on a Sunday rolls back to the same Mon..Fri", () => {
    // 2026-06-28 is a Sunday
    const { from } = weekRange(new Date("2026-06-28T00:00:00Z"));
    expect(ymd(from)).toBe("2026-06-22");
  });

  it("lists the five weekday columns", () => {
    expect(weekdayColumns(new Date("2026-06-24T00:00:00Z"))).toEqual([
      "2026-06-22",
      "2026-06-23",
      "2026-06-24",
      "2026-06-25",
      "2026-06-26",
    ]);
  });
});

describe("aggregateOverview", () => {
  it("sums per client across days and reports totals + open/closed", () => {
    const result = aggregateOverview([
      day("2026-06-22", "CLOSED", 8, [
        [elmar, 6, "Werk"],
        [altum, 2, "Rob"],
      ]),
      day("2026-06-23", "CLOSED", 8, [
        [elmar, 5, "Werk"],
        [rtz, 3, "Laptop"],
      ]),
      day("2026-06-24", "OPEN", 8, [[elmar, 1, "Bezig"]]),
    ]);

    const elmarRow = result.clients.find((c) => c.companyId === "c-elmar");
    expect(elmarRow?.total).toBe(12);
    expect(elmarRow?.byDate["2026-06-22"].hours).toBe(6);
    expect(elmarRow?.byDate["2026-06-24"].hours).toBe(1);

    // Sorted by total desc -> Elmar (12) first
    expect(result.clients[0].companyId).toBe("c-elmar");

    expect(result.totals.closedDays).toBe(2);
    expect(result.totals.openDays).toBe(1);
    expect(result.totals.totalDays).toBe(3);
    expect(result.totals.allocatedHours).toBe(17); // 8 + 8 + 1
    expect(result.totals.netHours).toBe(24); // 8 * 3
  });

  it("flags days where allocation != net hours", () => {
    const result = aggregateOverview([
      day("2026-06-22", "CLOSED", 8, [[elmar, 8, "ok"]]),
      day("2026-06-23", "OPEN", 8, [[elmar, 1, "incompleet"]]),
    ]);
    expect(result.days[0].balanced).toBe(true);
    expect(result.days[1].balanced).toBe(false);
  });

  it("sanity ok when every closed day balances and no open days", () => {
    const result = aggregateOverview([
      day("2026-06-22", "CLOSED", 8, [[elmar, 8, "ok"]]),
      day("2026-06-23", "CLOSED", 7.5, [
        [elmar, 5.25, "a"],
        [altum, 2.25, "b"],
      ]),
    ]);
    expect(result.sanity.ok).toBe(true);
    expect(result.sanity.diff).toBe(0);
  });

  it("an OPEN incomplete day does not trip the sanity check", () => {
    // OPEN days are legitimately not fully distributed yet.
    const result = aggregateOverview([
      day("2026-06-22", "OPEN", 8, [[elmar, 7, "incompleet"]]),
    ]);
    expect(result.sanity.ok).toBe(true);
    expect(result.totals.openDays).toBe(1);
    expect(result.days[0].balanced).toBe(false);
  });

  it("sanity flags a CLOSED day that does not balance (corrupt data)", () => {
    const result = aggregateOverview([
      // A CLOSED day should always balance; allocation 7 != net 8 = corruption.
      day("2026-06-22", "CLOSED", 8, [[elmar, 7, "kapot"]]),
    ]);
    expect(result.sanity.ok).toBe(false);
    expect(result.sanity.diff).toBe(-1); // allocated - net (closed only)
  });

  it("merges multiple allocations of the same client on one day", () => {
    const result = aggregateOverview([
      day("2026-06-22", "CLOSED", 8, [
        [elmar, 4, "ochtend"],
        [elmar, 4, "middag"],
      ]),
    ]);
    const elmarRow = result.clients[0];
    expect(elmarRow.total).toBe(8);
    expect(elmarRow.byDate["2026-06-22"].hours).toBe(8);
    expect(elmarRow.byDate["2026-06-22"].description).toBe("ochtend, middag");
  });
});
