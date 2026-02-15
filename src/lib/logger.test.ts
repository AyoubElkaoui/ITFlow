import { describe, it, expect, vi, beforeEach } from "vitest";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs JSON in production mode", async () => {
    // Set production env before importing
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    // Clear module cache to re-evaluate with new env
    vi.resetModules();
    const { logger } = await import("./logger");

    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.info("test message", { userId: "123" });

    expect(spy).toHaveBeenCalledOnce();
    const output = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.userId).toBe("123");
    expect(parsed.timestamp).toBeDefined();

    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  it("calls correct console method for each level", async () => {
    vi.resetModules();
    process.env.LOG_LEVEL = "debug";
    const { logger } = await import("./logger");

    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(debugSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();

    delete process.env.LOG_LEVEL;
  });
});
