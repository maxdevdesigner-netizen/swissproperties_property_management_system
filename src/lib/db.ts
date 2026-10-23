import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    // Secrets are left out of every query by default. The live app leaked
    // tenant.portalPassword through /api/dashboard; this makes that impossible
    // unless a query opts back in with `omit: { field: false }`.
    omit: {
      user: { password: true, twoFactorSecret: true },
      tenant: { portalPassword: true },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
