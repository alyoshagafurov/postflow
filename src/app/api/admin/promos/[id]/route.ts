import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { errorJson, json } from "@/lib/api";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return errorJson("Доступ запрещён", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorJson("Некорректные данные", 400);

  const promo = await prisma.promoCode.findUnique({ where: { id: params.id } });
  if (!promo) return errorJson("Промокод не найден", 404);

  await prisma.promoCode.update({
    where: { id: params.id },
    data: { isActive: parsed.data.isActive },
  });
  await writeAudit({
    userId: session.user.id,
    action: parsed.data.isActive ? "admin.promo.enable" : "admin.promo.disable",
    targetType: "PromoCode",
    targetId: promo.id,
    metadata: { code: promo.code },
  });

  return json({ ok: true });
}
