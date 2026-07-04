import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

export type PricingPlan = {
  tier: string;
  name: string;
  description?: string | null;
  priceCents: number;
  dailyLimit: number | null;
  minDailyLimit: number | null;
  maxDailyLimit: number | null;
  features: string[];
};

function priceLabel(cents: number): { amount: string; period: string } {
  if (cents === 0) return { amount: "$0", period: "навсегда" };
  const amount = `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
  return { amount, period: "/мес" };
}

function limitLabel(p: PricingPlan): string {
  if (p.dailyLimit === null) return "Без лимита публикаций";
  if (p.minDailyLimit && p.maxDailyLimit) {
    return `${p.minDailyLimit}–${p.maxDailyLimit} видео в день`;
  }
  return `${p.dailyLimit} видео в день`;
}

export function PricingCards({ plans }: { plans: PricingPlan[] }) {
  return (
    <section id="pricing" className="border-t border-border py-20 md:py-28">
      <div className="container">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Простые тарифы
          </h2>
          <p className="mt-3 text-muted-foreground">
            Начните бесплатно. Платите только за больше публикаций в день.
          </p>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-4">
          {plans.map((plan, i) => {
            const highlighted = plan.tier === "PRO";
            const price = priceLabel(plan.priceCents);
            return (
              <Reveal key={plan.tier} delay={i * 0.06}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border bg-card/40 p-6",
                    highlighted
                      ? "border-primary shadow-[0_0_40px_hsl(var(--primary)/0.15)]"
                      : "border-border",
                  )}
                >
                  {highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Популярный
                    </span>
                  )}
                  <div className="mb-1 text-lg font-medium">{plan.name}</div>
                  <p className="mb-4 min-h-10 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <div className="mb-1 flex items-end gap-1">
                    <span className="text-3xl font-semibold">
                      {price.amount}
                    </span>
                    <span className="mb-1 text-sm text-muted-foreground">
                      {price.period}
                    </span>
                  </div>
                  <div className="mb-6 text-sm font-medium text-primary">
                    {limitLabel(plan)}
                  </div>

                  <Button
                    asChild
                    variant={highlighted ? "default" : "outline"}
                    className="mb-6 w-full"
                  >
                    <Link href="/register">
                      {plan.priceCents === 0
                        ? "Начать бесплатно"
                        : `Выбрать ${plan.name}`}
                    </Link>
                  </Button>

                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Есть промокод? Активируйте его в разделе «Биллинг» после регистрации.
        </p>
      </div>
    </section>
  );
}
