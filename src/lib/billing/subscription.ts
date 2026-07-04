import { prisma } from "@/lib/db";
import { PlanTier, SubscriptionStatus } from "@prisma/client";

/**
 * Guarantee a user has a subscription row. New users start on Free.
 * Idempotent — safe to call on every sign-in.
 */
export async function ensureUserSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return existing;

  const freePlan = await prisma.plan.findUnique({
    where: { tier: PlanTier.FREE },
  });
  if (!freePlan) {
    throw new Error(
      "Free plan is not seeded. Run `npm run db:seed` before creating users.",
    );
  }

  return prisma.subscription.create({
    data: {
      userId,
      planId: freePlan.id,
      tier: PlanTier.FREE,
      status: SubscriptionStatus.ACTIVE,
    },
  });
}
