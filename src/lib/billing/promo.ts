import { PlanTier, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { ensureUserSubscription } from "@/lib/billing/subscription";

export type PromoResult = { ok: boolean; message: string };

/**
 * Redeem a promo code for a user. Grant-based codes (e.g. lifetime unlimited)
 * are applied directly to the subscription. Percentage/amount Stripe coupons
 * are handled at Stripe Checkout instead.
 */
export async function applyPromoCode(
  userId: string,
  rawCode: string,
): Promise<PromoResult> {
  const code = rawCode.trim();
  if (!code) return { ok: false, message: "Введите промокод" };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.isActive) {
    return { ok: false, message: "Промокод не найден или неактивен" };
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { ok: false, message: "Срок действия промокода истёк" };
  }
  if (
    promo.maxRedemptions != null &&
    promo.redemptionCount >= promo.maxRedemptions
  ) {
    return { ok: false, message: "Промокод исчерпан" };
  }

  const already = await prisma.promoRedemption.findUnique({
    where: { promoId_userId: { promoId: promo.id, userId } },
  });
  if (already) return { ok: false, message: "Промокод уже активирован" };

  await ensureUserSubscription(userId);

  const grantsTier = promo.grantsUnlimited
    ? PlanTier.UNLIMITED
    : promo.grantsTier;

  await prisma.$transaction(async (tx) => {
    await tx.promoRedemption.create({ data: { promoId: promo.id, userId } });
    await tx.promoCode.update({
      where: { id: promo.id },
      data: { redemptionCount: { increment: 1 } },
    });

    if (grantsTier) {
      const plan = await tx.plan.findUnique({ where: { tier: grantsTier } });
      if (plan) {
        await tx.subscription.update({
          where: { userId },
          data: {
            tier: grantsTier,
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            unlimitedOverride: promo.grantsUnlimited,
            appliedPromoId: promo.id,
          },
        });
      }
    }
  });

  await writeAudit({
    userId,
    action: "promo.redeem",
    targetType: "PromoCode",
    targetId: promo.id,
    metadata: { code },
  });

  return {
    ok: true,
    message: promo.grantsUnlimited
      ? "Безлимитный тариф активирован! 🎉"
      : "Промокод применён",
  };
}
