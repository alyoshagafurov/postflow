import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";
import { errorJson, json } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Минимум 8 символов").max(100),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const rl = await rateLimit({
    key: `password:${session.user.id}`,
    limit: 10,
    windowSec: 3600,
  });
  if (!rl.success) return errorJson("Слишком много попыток", 429);

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) return errorJson("Пользователь не найден", 404);

  // If a password already exists, the current one must be provided & correct.
  if (user.passwordHash) {
    const ok =
      parsed.data.currentPassword &&
      (await verifyPassword(parsed.data.currentPassword, user.passwordHash));
    if (!ok) return errorJson("Неверный текущий пароль", 400);
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  await writeAudit({ userId: user.id, action: "auth.change_password" });

  return json({ ok: true });
}
