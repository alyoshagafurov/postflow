import { formatInTimeZone } from "date-fns-tz";
import { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/db";

export type LimitInfo = {
  allowed: boolean;
  limit: number | null; // null = unlimited
  used: number;
  remaining: number | null; // null = unlimited
};

/** Effective daily publication limit for a user. null = unlimited. */
export async function getEffectiveDailyLimit(
  userId: string,
): Promise<number | null> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (!sub) {
    const free = await prisma.plan.findUnique({ where: { tier: PlanTier.FREE } });
    return free?.dailyLimit ?? 1;
  }
  if (sub.unlimitedOverride) return null;

  const plan = sub.plan;
  if (plan.dailyLimit === null) return null; // unlimited plan

  // Pro: user-configurable within [min, max]
  if (
    plan.minDailyLimit != null &&
    plan.maxDailyLimit != null &&
    sub.customDailyLimit != null
  ) {
    return Math.min(
      Math.max(sub.customDailyLimit, plan.minDailyLimit),
      plan.maxDailyLimit,
    );
  }
  return plan.dailyLimit;
}

/** User-local calendar date key, e.g. "2026-07-04". */
export function localDateKey(tz: string, at: Date = new Date()): string {
  return formatInTimeZone(at, tz, "yyyy-MM-dd");
}

/** Date value used as the UsageCounter key (midnight UTC of the local date). */
export function usageDate(tz: string, at: Date = new Date()): Date {
  return new Date(`${localDateKey(tz, at)}T00:00:00.000Z`);
}

export async function getUsageToday(
  userId: string,
  tz: string,
): Promise<number> {
  const counter = await prisma.usageCounter.findUnique({
    where: { userId_date: { userId, date: usageDate(tz) } },
  });
  return counter?.count ?? 0;
}

export async function incrementUsage(
  userId: string,
  tz: string,
  by = 1,
): Promise<void> {
  const date = usageDate(tz);
  await prisma.usageCounter.upsert({
    where: { userId_date: { userId, date } },
    update: { count: { increment: by } },
    create: { userId, date, count: by },
  });
}

export async function checkCanPublish(
  userId: string,
  tz: string,
): Promise<LimitInfo> {
  const [limit, used] = await Promise.all([
    getEffectiveDailyLimit(userId),
    getUsageToday(userId, tz),
  ]);
  if (limit === null) {
    return { allowed: true, limit: null, used, remaining: null };
  }
  return {
    allowed: used < limit,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}
