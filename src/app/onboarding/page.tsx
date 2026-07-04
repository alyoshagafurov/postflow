import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Добро пожаловать" };

export default async function OnboardingPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true },
  });
  const firstName = (user?.name ?? "").split(" ")[0] || undefined;
  return <OnboardingFlow firstName={firstName} />;
}
