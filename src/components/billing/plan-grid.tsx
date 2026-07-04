"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BillingPlan = {
  tier: string;
  name: string;
  description?: string | null;
  priceCents: number;
  dailyLimit: number | null;
  minDailyLimit: number | null;
  maxDailyLimit: number | null;
  features: string[];
};

function price(cents: number) {
  if (cents === 0) return "$0";
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

function limitText(p: BillingPlan) {
  if (p.dailyLimit === null) return "Без лимита";
  if (p.minDailyLimit && p.maxDailyLimit)
    return `${p.minDailyLimit}–${p.maxDailyLimit} в день`;
  return `${p.dailyLimit} в день`;
}

export function PlanGrid({
  plans,
  currentTier,
  stripeConfigured,
}: {
  plans: BillingPlan[];
  currentTier: string;
  stripeConfigured: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(tier: string) {
    setLoading(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ошибка");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {plans.map((p) => {
        const current = p.tier === currentTier;
        const highlighted = p.tier === "PRO";
        return (
          <div
            key={p.tier}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-card/40 p-5",
              current
                ? "border-primary"
                : highlighted
                  ? "border-primary/40"
                  : "border-border",
            )}
          >
            {current && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                Текущий
              </span>
            )}
            <div className="mb-1 font-medium">{p.name}</div>
            <div className="mb-3 flex items-end gap-1">
              <span className="text-2xl font-semibold">
                {price(p.priceCents)}
              </span>
              {p.priceCents > 0 && (
                <span className="mb-1 text-xs text-muted-foreground">/мес</span>
              )}
            </div>
            <div className="mb-4 text-sm font-medium text-primary">
              {limitText(p)}
            </div>

            {current ? (
              <Button variant="outline" className="mb-4" disabled>
                Активен
              </Button>
            ) : p.tier === "FREE" ? (
              <Button variant="outline" className="mb-4" disabled>
                Базовый
              </Button>
            ) : (
              <Button
                className="mb-4"
                disabled={loading !== null || !stripeConfigured}
                onClick={() => checkout(p.tier)}
                title={
                  stripeConfigured ? undefined : "Оплата картой ещё не настроена"
                }
              >
                {loading === p.tier ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `Перейти на ${p.name}`
                )}
              </Button>
            )}

            <ul className="space-y-2">
              {p.features.slice(0, 4).map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
