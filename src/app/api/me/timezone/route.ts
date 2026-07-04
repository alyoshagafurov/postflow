import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { errorJson, json } from "@/lib/api";

const schema = z.object({ timezone: z.string().min(1).max(64) });

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success || !isValidTimezone(parsed.data.timezone)) {
    return errorJson("Неверная таймзона", 400);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { timezone: parsed.data.timezone },
  });
  return json({ ok: true });
}
