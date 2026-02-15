import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  const config = { limit: 3, windowSeconds: 60 };

  it("allows requests within the limit", () => {
    const id = `test-${Date.now()}-allow`;
    const r1 = checkRateLimit(id, config);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(id, config);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(id, config);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding the limit", () => {
    const id = `test-${Date.now()}-block`;
    checkRateLimit(id, config);
    checkRateLimit(id, config);
    checkRateLimit(id, config);

    const r4 = checkRateLimit(id, config);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("uses separate windows per identifier", () => {
    const id1 = `test-${Date.now()}-a`;
    const id2 = `test-${Date.now()}-b`;

    checkRateLimit(id1, config);
    checkRateLimit(id1, config);
    checkRateLimit(id1, config);

    const r = checkRateLimit(id2, config);
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("returns correct limit and resetAt", () => {
    const id = `test-${Date.now()}-meta`;
    const result = checkRateLimit(id, config);
    expect(result.limit).toBe(3);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});
