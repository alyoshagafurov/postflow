import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { enqueuePublication } from "@/lib/scheduler";
import { recomputePostStatus } from "@/lib/posts";
import { writeAudit } from "@/lib/audit";
import { errorJson, json } from "@/lib/api";
import { PublicationStatus } from "@prisma/client";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const pub = await prisma.publication.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { socialAccount: { select: { status: true } } },
  });
  if (!pub) return errorJson("Публикация не найдена", 404);
  if (pub.status === PublicationStatus.PUBLISHED) {
    return errorJson("Уже опубликовано", 400);
  }

  const when = new Date();
  await prisma.publication.update({
    where: { id: pub.id },
    data: {
      status: PublicationStatus.PENDING,
      scheduledAt: when,
      errorCode: null,
      errorMessage: null,
    },
  });
  const result = await enqueuePublication(pub.id, when);
  await recomputePostStatus(pub.postId);
  await writeAudit({
    userId: session.user.id,
    action: "publication.retry",
    platform: pub.platform,
    targetType: "Publication",
    targetId: pub.id,
  });

  if (!result.queued) {
    return errorJson(
      "Очередь недоступна: не запущен Redis/воркер. Публикация ожидает.",
      503,
    );
  }
  return json({ ok: true });
}
