import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { features } from "@/lib/env";
import { checkCanPublish } from "@/lib/billing/limits";
import { getStripe } from "@/lib/billing/stripe";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageCard } from "@/components/billing/usage-card";
import { PlanGrid, type BillingPlan } from "@/components/billing/plan-grid";
import { PromoForm } from "@/components/billing/promo-form";
import { LimitBehaviorToggle } from "@/components/billing/limit-behavior";
import { ManageSubscriptionButton } from "@/components/billing/manage-button";
import { BillingToaster } from "@/components/billing/billing-toaster";

export const metadata: Metadata = { title: "Биллинг" };

function money(cents: number, currency = "usd") {
  const sym = currency.toLowerCase() === "usd" ? "$" : "";
  return `${sym}${(cents / 100).toFixed(2)}`;
}

export default async function BillingPage() {
  const sessionUser = await requireUser();
  const userId = sessionUser.id;

  const [user, subscription, plans] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, limitBehavior: true },
    }),
    prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const tz = user?.timezone || "UTC";
  const usage = await checkCanPublish(userId, tz);

  const billingPlans: BillingPlan[] = plans.map((p) => ({
    tier: p.tier,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
    dailyLimit: p.dailyLimit,
    minDailyLimit: p.minDailyLimit,
    maxDailyLimit: p.maxDailyLimit,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
  }));

  const currentTier = subscription?.tier ?? "FREE";
  const currentPlan = subscription?.plan;

  // Payment history (Stripe), if configured.
  const stripe = getStripe();
  let payments: {
    id: string;
    amount: number;
    currency: string;
    status: string | null;
    date: number;
    url: string | null;
  }[] = [];
  if (stripe && subscription?.stripeCustomerId) {
    try {
      const invoices = await stripe.invoices.list({
        customer: subscription.stripeCustomerId,
        limit: 10,
      });
      payments = invoices.data.map((i) => ({
        id: i.id ?? "",
        amount: i.amount_paid,
        currency: i.currency,
        status: i.status,
        date: i.created,
        url: i.hosted_invoice_url ?? null,
      }));
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Suspense>
        <BillingToaster />
      </Suspense>
      <PageHeader
        title="Биллинг"
        description="Тариф, лимиты, промокоды и история платежей."
      >
        {subscription?.stripeCustomerId && <ManageSubscriptionButton />}
      </PageHeader>

      <div className="space-y-8">
        <UsageCard
          planName={currentPlan?.name ?? "Free"}
          tier={currentTier}
          used={usage.used}
          limit={usage.limit}
          min={currentPlan?.minDailyLimit ?? null}
          max={currentPlan?.maxDailyLimit ?? null}
          customLimit={subscription?.customDailyLimit ?? null}
        />

        <section>
          <h2 className="mb-3 text-lg font-semibold">Сменить тариф</h2>
          <PlanGrid
            plans={billingPlans}
            currentTier={currentTier}
            stripeConfigured={features.stripe}
          />
          {!features.stripe && (
            <p className="mt-3 text-xs text-muted-foreground">
              Оплата картой активируется после подключения Stripe. Промокоды
              работают уже сейчас.
            </p>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Промокод</CardTitle>
          </CardHeader>
          <CardContent>
            <PromoForm />
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-3 text-lg font-semibold">
            При превышении лимита
          </h2>
          <LimitBehaviorToggle
            initial={user?.limitBehavior ?? "SUGGEST_UPGRADE"}
          />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">История платежей</h2>
          {payments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Платежей пока нет.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {money(p.amount, p.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.date * 1000).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {p.status}
                      </span>
                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Чек
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
