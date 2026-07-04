import { resetPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/ratelimit";
import { writeAudit } from "@/lib/audit";
import { errorJson, getClientIp, json, zodFieldErrors } from "@/lib/api";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: `reset:${ip}`, limit: 10, windowSec: 900 });
  if (!rl.success) {
    return errorJson("Слишком много попыток. Попробуйте позже.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson("Проверьте поля формы", 400, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });
  if (!record || record.expires < new Date()) {
    return errorJson("Ссылка недействительна или устарела", 400);
  }

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user) {
    return errorJson("Ссылка недействительна", 400);
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordResetToken.deleteMany({ where: { email: record.email } }),
  ]);

  await writeAudit({ userId: user.id, action: "auth.reset_password", ip });

  return json({ ok: true });
}
