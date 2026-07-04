import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { errorJson, json } from "@/lib/api";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardedAt: new Date() },
  });
  return json({ ok: true });
}
