import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { cancelPublicationJob } from "@/lib/scheduler";
import { recomputePostStatus } from "@/lib/posts";
import { writeAudit } from "@/lib/audit";
import { errorJson, json } from "@/lib/api";
import { PublicationStatus } from "@prisma/client";

const CANCELABLE: PublicationStatus[] = [
  PublicationStatus.PENDING,
  PublicationStatus.QUEUED,
];

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const pub = await prisma.publication.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!pub) return errorJson("Публикация не найдена", 404);
  if (!CANCELABLE.includes(pub.status)) {
    return errorJson("Эту публикацию нельзя отменить", 400);
  }

  await cancelPublicationJob(pub.id);
  await prisma.publication.update({
    where: { id: pub.id },
    data: { status: PublicationStatus.CANCELED },
  });
  await recomputePostStatus(pub.postId);
  await writeAudit({
    userId: session.user.id,
    action: "publication.cancel",
    platform: pub.platform,
    targetType: "Publication",
    targetId: pub.id,
  });

  return json({ ok: true });
}
