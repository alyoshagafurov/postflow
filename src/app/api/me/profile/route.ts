import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { errorJson, json } from "@/lib/api";

const schema = z.object({ name: z.string().min(2, "Введите имя").max(80) });

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorJson("Введите корректное имя", 400);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });
  return json({ ok: true });
}
