import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPool() {
  const url = new URL(process.env.DATABASE_URL!);
  return new Pool({
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(createPool()),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
