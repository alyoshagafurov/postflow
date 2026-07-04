import { prisma } from "@/lib/db";
import type { Platform } from "@prisma/client";

export type AuditInput = {
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  platform?: Platform;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Append an audit-log entry. Best-effort: never throws into the caller so a
 * logging failure can't break a user action.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        platform: input.platform,
        ip: input.ip,
        userAgent: input.userAgent,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (input.metadata as any) ?? undefined,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write entry", input.action, err);
  }
}
