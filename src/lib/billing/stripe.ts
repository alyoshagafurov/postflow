import Stripe from "stripe";
import { env, features } from "@/lib/env";
import { prisma } from "@/lib/db";

let stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!features.stripe) return null;
  if (!stripe) stripe = new Stripe(env.STRIPE_SECRET_KEY);
  return stripe;
}

export async function getOrCreateCustomer(
  userId: string,
  email: string | null,
): Promise<string | null> {
  const s = getStripe();
  if (!s) return null;

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const customer = await s.customers.create({
    email: email ?? undefined,
    metadata: { userId },
  });
  await prisma.subscription
    .update({ where: { userId }, data: { stripeCustomerId: customer.id } })
    .catch(() => {});
  return customer.id;
}
