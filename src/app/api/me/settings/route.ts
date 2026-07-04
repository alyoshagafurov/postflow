import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { errorJson, json } from "@/lib/api";

const schema = z.object({
  limitBehavior: z.enum(["QUEUE_NEXT_DAY", "SUGGEST_UPGRADE"]).optional(),
  customDailyLimit: z.number().int().min(1).max(100).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorJson("Некорректные данные", 400);
  const { limitBehavior, customDailyLimit } = parsed.data;

  if (limitBehavior) {
    await prisma.user.update({
      where: { id: userId },
      data: { limitBehavior },
    });
  }

  if (customDailyLimit != null) {
    const sub = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (sub?.plan?.minDailyLimit != null && sub.plan.maxDailyLimit != null) {
      const clamped = Math.min(
        Math.max(customDailyLimit, sub.plan.minDailyLimit),
        sub.plan.maxDailyLimit,
      );
      await prisma.subscription.update({
        where: { userId },
        data: { customDailyLimit: clamped },
      });
    } else {
      return errorJson("Настраиваемый лимит доступен только на тарифе Pro", 400);
    }
  }

  return json({ ok: true });
}
