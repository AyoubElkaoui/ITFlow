import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl =
    process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL or POSTGRES_PRISMA_URL environment variable is not set",
    );
  }
  const url = new URL(dbUrl);

  // Supabase pooler: force TRANSACTION mode (port 6543) instead of SESSION mode
  // (5432) whenever we hit the pooler host. Session mode caps at ~15 concurrent
  // clients ("EMAXCONNSESSION - max clients reached in session mode"); on a
  // serverless host (Vercel) every function instance opens its own pool, so a
  // handful of concurrent requests exhausts that cap and every DB query 500s.
  // Transaction mode multiplexes many clients over few connections — the
  // supported setup for serverless. Self-hosted Postgres (host "db") is untouched.
  const isSupabasePooler = url.hostname.endsWith("pooler.supabase.com");
  const port =
    isSupabasePooler && (Number(url.port) || 5432) === 5432
      ? 6543
      : Number(url.port) || 5432;

  const pool = new Pool({
    host: url.hostname,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    // Small per-instance pool: on serverless each instance holds its own pool,
    // so keep the connection footprint low. 5 covers the couple of parallel
    // queries a single request issues (e.g. Promise.all([findMany, count])).
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl:
      url.searchParams.get("sslmode") === "require"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  return new PrismaClient({
    adapter: new PrismaPg(pool),
  });
}

// Lazy singleton - only creates the client when first accessed at runtime
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (!globalForPrisma._prisma) {
      globalForPrisma._prisma = createPrismaClient();
    }
    return Reflect.get(globalForPrisma._prisma, prop);
  },
});
