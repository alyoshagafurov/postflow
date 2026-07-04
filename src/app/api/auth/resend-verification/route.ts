import { forgotPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { createAndSendEmailVerification } from "@/lib/verification";
import { rateLimit } from "@/lib/ratelimit";
import { errorJson, getClientIp, json } from "@/lib/api";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: `resend:${ip}`, limit: 5, windowSec: 900 });
  if (!rl.success) {
    return errorJson("Слишком много попыток. Попробуйте позже.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return errorJson("Введите корректный email", 400);

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  // Only (re)send for real, still-unverified password accounts. Always return
  // ok so the endpoint can't be used to probe which emails are registered.
  if (user?.passwordHash && !user.emailVerified) {
    void createAndSendEmailVerification(email).catch(() => {});
  }
  return json({ ok: true });
}
