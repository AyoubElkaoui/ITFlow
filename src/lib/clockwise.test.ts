import { describe, it, expect } from "vitest";
import {
  formatHours,
  sumHours,
  isQuarter,
  generateClockwiseFormat,
} from "./clockwise";

describe("formatHours", () => {
  // De trailing-nul-regel: geen "1.0", wel "5.25" / "7.5" / "0.75".
  it("strips trailing zeros", () => {
    expect(formatHours(1)).toBe("1");
    expect(formatHours(2)).toBe("2");
    expect(formatHours(8)).toBe("8");
    expect(formatHours(7.5)).toBe("7.5");
    expect(formatHours(0.75)).toBe("0.75");
    expect(formatHours(5.25)).toBe("5.25");
    expect(formatHours(7.25)).toBe("7.25");
    expect(formatHours(0)).toBe("0");
  });

  it("snaps to the nearest quarter", () => {
    expect(formatHours(1.1)).toBe("1");
    expect(formatHours(1.13)).toBe("1.25");
    expect(formatHours(8.49)).toBe("8.5");
  });

  it("avoids floating point drift", () => {
    expect(formatHours(0.1 + 0.2)).toBe("0.25");
  });
});

describe("sumHours / isQuarter", () => {
  it("sums on the quarter grid", () => {
    expect(sumHours([{ hours: 5.25 }, { hours: 1 }, { hours: 1 }])).toBe(7.25);
    expect(sumHours([{ hours: 0.25 }, { hours: 0.25 }, { hours: 0.25 }])).toBe(
      0.75,
    );
  });

  it("detects quarter increments", () => {
    expect(isQuarter(0.25)).toBe(true);
    expect(isQuarter(7.5)).toBe(true);
    expect(isQuarter(1)).toBe(true);
    expect(isQuarter(0.3)).toBe(false);
    expect(isQuarter(1.1)).toBe(false);
  });
});

describe("generateClockwiseFormat", () => {
  it("reproduces the exact example", () => {
    const result = generateClockwiseFormat({
      start: "10:00",
      entries: [
        { code: "Elmar", hours: 5.25, description: "Elmar Werkzaamheden" },
        {
          code: "Altum",
          hours: 1,
          description: "Rob schrijf vervangen en nieuwe laptop gebracht",
        },
        { code: "RTZ", hours: 1, description: "Laptop gerrit klaargemaakt" },
      ],
    });

    expect(result.total).toBe("7.25");
    expect(result.range).toBe("10:00 : 17:15");
    expect(result.distribution).toBe(
      "Elmar: 5.25 Elmar Werkzaamheden | Altum: 1 Rob schrijf vervangen en nieuwe laptop gebracht | RTZ: 1 Laptop gerrit klaargemaakt",
    );
    expect(result.lines).toEqual([result.total, result.range, result.distribution]);
    expect(result.text).toBe(
      ["7.25", "10:00 : 17:15", result.distribution].join("\n"),
    );
  });

  it("strips the leading zero from the hour in the range", () => {
    const result = generateClockwiseFormat({
      start: "09:00",
      entries: [{ code: "Elmar", hours: 8, description: "Werkzaamheden" }],
    });
    // 09:00 + 8u = 17:00, start zonder leading zero
    expect(result.range).toBe("9:00 : 17:00");
    expect(result.total).toBe("8");
  });

  it("handles a half-hour net total without pause gap", () => {
    const result = generateClockwiseFormat({
      start: "09:00",
      entries: [
        { code: "Elmar", hours: 8, description: "Werk" },
        { code: "AK", hours: 0.5, description: "Dev" },
      ],
    });
    // 8.5u netto vanaf 09:00 -> 17:30 (geen-pauze dag)
    expect(result.total).toBe("8.5");
    expect(result.range).toBe("9:00 : 17:30");
  });

  it("crosses the half hour boundary correctly", () => {
    const result = generateClockwiseFormat({
      start: "08:45",
      entries: [{ code: "ZVOS", hours: 0.75, description: "Support" }],
    });
    expect(result.range).toBe("8:45 : 9:30");
    expect(result.distribution).toBe("ZVOS: 0.75 Support");
  });
});
