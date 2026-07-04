import type Stripe from "stripe";
import { PlanTier, SubscriptionStatus } from "@prisma/client";
import { getStripe } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "unpaid":
      return SubscriptionStatus.UNPAID;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "incomplete":
    case "incomplete_expired":
      return SubscriptionStatus.INCOMPLETE;
    default:
      return SubscriptionStatus.ACTIVE;
  }
}

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.userId;
        const tier = s.metadata?.tier as PlanTier | undefined;
        if (userId && tier) {
          const plan = await prisma.plan.findUnique({ where: { tier } });
          await prisma.subscription
            .update({
              where: { userId },
              data: {
                tier,
                planId: plan?.id,
                status: SubscriptionStatus.ACTIVE,
                stripeCustomerId:
                  typeof s.customer === "string" ? s.customer : undefined,
                stripeSubscriptionId:
                  typeof s.subscription === "string"
                    ? s.subscription
                    : undefined,
              },
            })
            .catch(() => {});
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subObj = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subObj.customer === "string"
            ? subObj.customer
            : subObj.customer.id;
        const local = await prisma.subscription.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (local) {
          if (
            event.type === "customer.subscription.deleted" ||
            subObj.status === "canceled"
          ) {
            const free = await prisma.plan.findUnique({
              where: { tier: PlanTier.FREE },
            });
            await prisma.subscription.update({
              where: { id: local.id },
              data: {
                tier: PlanTier.FREE,
                planId: free?.id ?? local.planId,
                status: SubscriptionStatus.CANCELED,
                stripeSubscriptionId: null,
                cancelAtPeriodEnd: false,
              },
            });
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const periodEnd = (subObj as any).current_period_end as
              | number
              | undefined;
            await prisma.subscription.update({
              where: { id: local.id },
              data: {
                status: mapStatus(subObj.status),
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
                cancelAtPeriodEnd: subObj.cancel_at_period_end ?? false,
              },
            });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[webhook] handler error", e);
  }

  return new Response("ok", { status: 200 });
}
