import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Features } from "@/components/marketing/features";
import {
  PricingCards,
  type PricingPlan,
} from "@/components/marketing/pricing-cards";
import { Faq } from "@/components/marketing/faq";
import { CtaBand } from "@/components/marketing/cta-band";

export const metadata: Metadata = {
  title: "PostFlow — автопубликация видео в TikTok, YouTube и Instagram",
};

// Rendered per-request so the landing never depends on the DB being reachable
// at build time.
export const dynamic = "force-dynamic";

async function getPlans(): Promise<PricingPlan[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return plans.map((p) => ({
    tier: p.tier,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
    dailyLimit: p.dailyLimit,
    minDailyLimit: p.minDailyLimit,
    maxDailyLimit: p.maxDailyLimit,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
  }));
}

export default async function LandingPage() {
  const plans = await getPlans();
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <PricingCards plans={plans} />
      <Faq />
      <CtaBand />
    </>
  );
}
