import { describe, it, expect, vi } from "vitest";

// Mock prisma to avoid database connection during tests
vi.mock("./prisma", () => ({
  prisma: {},
}));

import { diffChanges } from "./audit";

describe("diffChanges", () => {
  it("returns undefined when no changes", () => {
    const result = diffChanges(
      { name: "Alice", age: 30 },
      { name: "Alice", age: 30 },
    );
    expect(result).toBeUndefined();
  });

  it("detects changed fields", () => {
    const result = diffChanges(
      { name: "Alice", age: 30 },
      { name: "Bob", age: 30 },
    );
    expect(result).toEqual({
      name: { old: "Alice", new: "Bob" },
    });
  });

  it("detects multiple changes", () => {
    const result = diffChanges(
      { name: "Alice", age: 30, role: "user" },
      { name: "Bob", age: 31, role: "user" },
    );
    expect(result).toEqual({
      name: { old: "Alice", new: "Bob" },
      age: { old: 30, new: 31 },
    });
  });

  it("detects new fields in newData", () => {
    const result = diffChanges(
      { name: "Alice" },
      { name: "Alice", email: "alice@test.com" },
    );
    expect(result).toEqual({
      email: { old: undefined, new: "alice@test.com" },
    });
  });

  it("handles nested objects via JSON comparison", () => {
    const result = diffChanges({ meta: { a: 1 } }, { meta: { a: 2 } });
    expect(result).toEqual({
      meta: { old: { a: 1 }, new: { a: 2 } },
    });
  });
});
