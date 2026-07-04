import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { errorJson, json } from "@/lib/api";

const schema = z.object({
  code: z
    .string()
    .min(2, "Минимум 2 символа")
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "Только буквы, цифры, _ и -"),
  description: z.string().max(200).optional(),
  grantsUnlimited: z.boolean().optional(),
  percentOff: z.number().int().min(0).max(100).optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  durationMonths: z.number().int().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return errorJson("Доступ запрещён", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorJson(parsed.error.issues[0]?.message ?? "Некорректные данные", 400);
  }
  const input = parsed.data;

  const existing = await prisma.promoCode.findUnique({
    where: { code: input.code },
  });
  if (existing) return errorJson("Такой промокод уже существует", 409);

  const promo = await prisma.promoCode.create({
    data: {
      code: input.code,
      description: input.description,
      type: input.grantsUnlimited ? "UNLIMITED" : "PERCENT",
      grantsUnlimited: input.grantsUnlimited ?? false,
      grantsTier: input.grantsUnlimited ? "UNLIMITED" : null,
      percentOff: input.percentOff ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      durationMonths: input.durationMonths ?? null,
      isActive: true,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "admin.promo.create",
    targetType: "PromoCode",
    targetId: promo.id,
    metadata: { code: promo.code },
  });

  return json({ ok: true, id: promo.id }, 201);
}
