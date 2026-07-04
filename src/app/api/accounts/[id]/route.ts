import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { errorJson, json } from "@/lib/api";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const account = await prisma.socialAccount.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!account) return errorJson("Аккаунт не найден", 404);

  await prisma.socialAccount.delete({ where: { id: account.id } });
  await writeAudit({
    userId: session.user.id,
    action: "social_account.disconnect",
    platform: account.platform,
    targetType: "SocialAccount",
    targetId: account.id,
  });

  return json({ ok: true });
}
