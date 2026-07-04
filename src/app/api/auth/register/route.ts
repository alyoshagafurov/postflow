import { registerSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { ensureUserSubscription } from "@/lib/billing/subscription";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";
import { errorJson, getClientIp, json, zodFieldErrors } from "@/lib/api";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: `register:${ip}`, limit: 8, windowSec: 3600 });
  if (!rl.success) {
    return errorJson("Слишком много попыток. Попробуйте позже.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Проверьте поля формы", 400, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return errorJson("Пользователь с таким email уже существует", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  await ensureUserSubscription(user.id);
  await writeAudit({
    userId: user.id,
    action: "auth.register",
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return json({ ok: true }, 201);
}
