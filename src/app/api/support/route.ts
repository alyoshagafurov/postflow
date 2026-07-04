import { z } from "zod";
import { getSession } from "@/lib/session";
import { sendEmail, emailLayout } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";
import { errorJson, json } from "@/lib/api";
import { env } from "@/lib/env";

const schema = z.object({
  subject: z.string().min(2, "Укажите тему").max(150),
  message: z.string().min(5, "Опишите вопрос").max(4000),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const rl = await rateLimit({
    key: `support:${session.user.id}`,
    limit: 5,
    windowSec: 3600,
  });
  if (!rl.success) {
    return errorJson("Слишком много обращений. Попробуйте позже.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorJson("Заполните тему и сообщение", 400);

  const from = session.user.email ?? session.user.id;
  await sendEmail({
    to: env.SUPPORT_EMAIL,
    subject: `[Поддержка] ${parsed.data.subject}`,
    html: emailLayout(
      "Обращение в поддержку",
      `<p><b>От:</b> ${from}</p><p><b>Тема:</b> ${parsed.data.subject}</p><p>${parsed.data.message.replace(/\n/g, "<br>")}</p>`,
    ),
    text: `От: ${from}\nТема: ${parsed.data.subject}\n\n${parsed.data.message}`,
  });

  return json({ ok: true });
}
