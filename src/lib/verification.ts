import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail, emailLayout } from "@/lib/email";
import { env } from "@/lib/env";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create a fresh email-verification token (one active per email) and send the
 * confirmation link. Reuses the NextAuth `VerificationToken` table.
 */
export async function createAndSendEmailVerification(email: string) {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + TTL_MS) },
  });

  const link = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Подтвердите email · PostFlow",
    html: emailLayout(
      "Подтверждение email",
      `<p>Спасибо за регистрацию в PostFlow! Подтвердите адрес, чтобы войти в аккаунт.</p>
       <p style="margin:24px 0"><a href="${link}" style="background:#7C5CFF;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;display:inline-block">Подтвердить email</a></p>
       <p style="color:#666;font-size:12px">Ссылка действует 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.</p>`,
    ),
    text: `Подтвердите email PostFlow: ${link} (ссылка действует 24 часа)`,
  });
}

/** Consume a token and mark the matching user's email as verified. */
export async function verifyEmailToken(
  token: string,
): Promise<{ ok: boolean; message: string }> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
  if (!record) return { ok: false, message: "Ссылка недействительна" };

  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    });
    return { ok: false, message: "Срок действия ссылки истёк" };
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    }),
  ]);
  return { ok: true, message: "Email подтверждён" };
}
