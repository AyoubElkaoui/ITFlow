import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function logAudit(params: {
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  changes?: Record<string, { old: unknown; new: unknown }>;
  userId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      changes: params.changes as never,
      metadata: params.metadata as never,
    },
  });
}

/** Fire-and-forget audit log that logs errors but never crashes the caller */
export function safeLogAudit(params: Parameters<typeof logAudit>[0]): void {
  logAudit(params).catch((error) => {
    logger.error("Audit log failed", {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

export function diffChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> | undefined {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(newData)) {
    const oldVal = oldData[key];
    const newVal = newData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}
