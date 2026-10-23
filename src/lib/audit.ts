import "server-only";
import { db } from "@/lib/db";
import type { AuditAction } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(entry: {
  action: AuditAction;
  entity: string;
  entityId?: string;
  userId?: string;
  details?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({ data: entry });
  } catch (err) {
    // Never fail the user's action because the audit write failed.
    console.error("audit log write failed", err);
  }
}
