import crypto from "node:crypto";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { sendEmail, emailLayout } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";
import { writeAudit } from "@/lib/audit";
import { errorJson, getClientIp, json } from "@/lib/api";
import { env } from "@/lib/env";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await rateLimit({ key: `forgot:${ip}`, limit: 5, windowSec: 900 });
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
  if (!parsed.success) {
    return errorJson("Введите корректный email", 400);
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Only send a link to real password accounts, but always return ok so the
  // endpoint can't be used to enumerate registered emails.
  if (user?.passwordHash) {
    await prisma.passwordResetToken.deleteMany({ where: { email } });
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const link = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Сброс пароля · PostFlow",
      html: emailLayout(
        "Сброс пароля",
        `<p>Вы запросили сброс пароля. Ссылка действует 1 час:</p>
         <p style="margin:24px 0"><a href="${link}" style="background:#7C5CFF;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">Задать новый пароль</a></p>
         <p style="color:#666;font-size:12px">Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>`,
      ),
      text: `Сброс пароля PostFlow: ${link} (ссылка действует 1 час)`,
    });

    await writeAudit({ userId: user.id, action: "auth.forgot_password", ip });
  }

  return json({ ok: true });
}
