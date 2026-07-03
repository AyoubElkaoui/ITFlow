import { describe, it, expect } from "vitest";
import { minutesToBillableHours } from "./time-sync";
import { zonedYmd } from "./tz";

describe("minutesToBillableHours", () => {
  it("rondt af op kwartier met een ondergrens van 0,25u", () => {
    expect(minutesToBillableHours(1)).toBe(0.25); // korte log -> min 0,25
    expect(minutesToBillableHours(7)).toBe(0.25);
    expect(minutesToBillableHours(8)).toBe(0.25);
    expect(minutesToBillableHours(15)).toBe(0.25);
    expect(minutesToBillableHours(23)).toBe(0.5); // 0,383u -> 0,5
    expect(minutesToBillableHours(30)).toBe(0.5);
    expect(minutesToBillableHours(45)).toBe(0.75);
    expect(minutesToBillableHours(60)).toBe(1);
    expect(minutesToBillableHours(90)).toBe(1.5);
    expect(minutesToBillableHours(100)).toBe(1.75); // 1,667u -> 1,75
  });
});

describe("zonedYmd", () => {
  it("houdt de kalenderdag in NL-tijd, ook rond middernacht", () => {
    // Zomertijd (CEST, +2): 21:30Z = 23:30 NL -> zelfde dag.
    expect(zonedYmd(new Date("2026-07-03T21:30:00Z"))).toBe("2026-07-03");
    // 22:30Z = 00:30 NL de dag erna.
    expect(zonedYmd(new Date("2026-07-03T22:30:00Z"))).toBe("2026-07-04");
    // Wintertijd (CET, +1): 23:30Z = 00:30 NL de dag erna.
    expect(zonedYmd(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
  });
});
