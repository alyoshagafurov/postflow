import { z } from "zod";
import { verifyEmailToken } from "@/lib/verification";
import { rateLimit } from "@/lib/ratelimit";
import { errorJson, getClientIp, json } from "@/lib/api";

const schema = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: `verify:${ip}`, limit: 20, windowSec: 900 });
  if (!rl.success) return errorJson("Слишком много попыток", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorJson("Неверная ссылка", 400);

  const result = await verifyEmailToken(parsed.data.token);
  if (!result.ok) return errorJson(result.message, 400);
  return json({ ok: true });
}
