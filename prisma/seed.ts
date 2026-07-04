import { PlanTier, PrismaClient, PromoType } from "@prisma/client";

const prisma = new PrismaClient();

type PlanSeed = {
  tier: PlanTier;
  name: string;
  description: string;
  dailyLimit: number | null;
  minDailyLimit: number | null;
  maxDailyLimit: number | null;
  priceCents: number;
  sortOrder: number;
  features: string[];
};

const PLANS: PlanSeed[] = [
  {
    tier: PlanTier.FREE,
    name: "Free",
    description: "Чтобы попробовать автопубликацию.",
    dailyLimit: 1,
    minDailyLimit: null,
    maxDailyLimit: null,
    priceCents: 0,
    sortOrder: 0,
    features: [
      "1 публикация в день",
      "TikTok, YouTube и Instagram",
      "Планирование по времени",
      "Неограниченно аккаунтов",
    ],
  },
  {
    tier: PlanTier.STARTER,
    name: "Starter",
    description: "Для регулярного постинга.",
    dailyLimit: 2,
    minDailyLimit: null,
    maxDailyLimit: null,
    priceCents: 100,
    sortOrder: 1,
    features: [
      "2 публикации в день",
      "Все возможности Free",
      "Кастомные обложки",
      "Адаптация текста под платформу",
    ],
  },
  {
    tier: PlanTier.PRO,
    name: "Pro",
    description: "Для активных авторов и небольших команд.",
    dailyLimit: 6,
    minDailyLimit: 3,
    maxDailyLimit: 6,
    priceCents: 200,
    sortOrder: 2,
    features: [
      "От 3 до 6 публикаций в день (настраивается)",
      "Все возможности Starter",
      "Приоритет в очереди публикаций",
      "Расширенная статистика",
    ],
  },
  {
    tier: PlanTier.UNLIMITED,
    name: "Unlimited",
    description: "Без ограничений по количеству.",
    dailyLimit: null,
    minDailyLimit: null,
    maxDailyLimit: null,
    priceCents: 500,
    sortOrder: 3,
    features: [
      "Безлимитные публикации",
      "Все возможности Pro",
      "Максимальный приоритет",
      "Поддержка в приоритете",
    ],
  },
];

async function seedPlans() {
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { tier: p.tier },
      update: {
        name: p.name,
        description: p.description,
        dailyLimit: p.dailyLimit,
        minDailyLimit: p.minDailyLimit,
        maxDailyLimit: p.maxDailyLimit,
        priceCents: p.priceCents,
        sortOrder: p.sortOrder,
        features: p.features,
        isActive: true,
      },
      create: {
        tier: p.tier,
        name: p.name,
        description: p.description,
        dailyLimit: p.dailyLimit,
        minDailyLimit: p.minDailyLimit,
        maxDailyLimit: p.maxDailyLimit,
        priceCents: p.priceCents,
        sortOrder: p.sortOrder,
        features: p.features,
        isActive: true,
      },
    });
    console.log(`  ✓ plan: ${p.name}`);
  }
}

async function seedPromoCodes() {
  // Owner lifetime code: grants Unlimited forever, 100% off.
  // Stored as a real promo code (unlimited flag), never hard-coded in the UI.
  await prisma.promoCode.upsert({
    where: { code: "alygafurov" },
    update: {
      description: "Пожизненный безлимит (владелец)",
      type: PromoType.UNLIMITED,
      percentOff: 100,
      grantsUnlimited: true,
      grantsTier: PlanTier.UNLIMITED,
      durationMonths: null,
      isActive: true,
      maxRedemptions: null,
    },
    create: {
      code: "alygafurov",
      description: "Пожизненный безлимит (владелец)",
      type: PromoType.UNLIMITED,
      percentOff: 100,
      grantsUnlimited: true,
      grantsTier: PlanTier.UNLIMITED,
      durationMonths: null,
      isActive: true,
      maxRedemptions: null,
    },
  });
  console.log("  ✓ promo: alygafurov (lifetime unlimited)");
}

async function main() {
  console.log("Seeding database…");
  await seedPlans();
  await seedPromoCodes();
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
