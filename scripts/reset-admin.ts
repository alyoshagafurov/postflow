/**
 * Danger: wipes ALL users and (re)creates a single ADMIN account.
 * Requires ADMIN_EMAIL and ADMIN_PASSWORD env vars so it can't run by accident.
 *
 * Run in the Railway Console (postflow service):
 *   ADMIN_NAME=aly ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret npm run admin:reset
 */
import {
  PlanTier,
  PrismaClient,
  Role,
  SubscriptionStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME || "Admin";
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.");
  }

  const before = await prisma.user.count();
  // Cascades to posts, social accounts, subscriptions, publications, etc.
  await prisma.user.deleteMany({});
  console.log(`Deleted ${before} user(s).`);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: Role.ADMIN,
      emailVerified: new Date(), // already confirmed → can log in immediately
    },
  });

  const free = await prisma.plan.findUnique({ where: { tier: PlanTier.FREE } });
  if (free) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: free.id,
        tier: PlanTier.FREE,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  console.log(`Admin ready: ${email} (role=ADMIN, email verified, Free plan).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
