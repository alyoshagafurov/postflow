import { z } from "zod";
import { getSession } from "@/lib/session";
import { applyPromoCode } from "@/lib/billing/promo";
import { rateLimit } from "@/lib/ratelimit";
import { errorJson, json } from "@/lib/api";

const schema = z.object({ code: z.string().min(1).max(64) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const rl = await rateLimit({
    key: `promo:${session.user.id}`,
    limit: 12,
    windowSec: 3600,
  });
  if (!rl.success) {
    return errorJson("Слишком много попыток. Попробуйте позже.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorJson("Введите промокод", 400);

  const result = await applyPromoCode(session.user.id, parsed.data.code);
  if (!result.ok) return errorJson(result.message, 400);
  return json({ ok: true, message: result.message });
}
