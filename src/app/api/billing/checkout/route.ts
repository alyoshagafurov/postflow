import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getStripe, getOrCreateCustomer } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { errorJson, json } from "@/lib/api";

const schema = z.object({ tier: z.enum(["STARTER", "PRO", "UNLIMITED"]) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const stripe = getStripe();
  if (!stripe) {
    return errorJson("Оплата картой ещё не настроена (нет ключей Stripe)", 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorJson("Неверный тариф", 400);

  const plan = await prisma.plan.findUnique({
    where: { tier: parsed.data.tier },
  });
  if (!plan?.stripePriceId) {
    return errorJson("Для этого тарифа не задан Stripe Price ID", 400);
  }

  const customerId = await getOrCreateCustomer(
    session.user.id,
    session.user.email ?? null,
  );
  if (!customerId) return errorJson("Не удалось создать клиента Stripe", 500);

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${env.NEXT_PUBLIC_APP_URL}/billing?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/billing?checkout=cancel`,
    metadata: { userId: session.user.id, tier: parsed.data.tier },
    subscription_data: {
      metadata: { userId: session.user.id, tier: parsed.data.tier },
    },
  });

  return json({ url: checkout.url });
}
