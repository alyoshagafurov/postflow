import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { errorJson, json } from "@/lib/api";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const stripe = getStripe();
  if (!stripe) return errorJson("Stripe не настроен", 503);

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });
  if (!sub?.stripeCustomerId) {
    return errorJson("Нет активной подписки Stripe", 400);
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/billing`,
  });
  return json({ url: portal.url });
}
