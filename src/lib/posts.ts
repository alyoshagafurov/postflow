import { PostStatus, PublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

const ACTIVE: PublicationStatus[] = [
  PublicationStatus.PENDING,
  PublicationStatus.QUEUED,
  PublicationStatus.PROCESSING,
];

/** Derive a post's status from the state of its publications. */
export async function recomputePostStatus(postId: string) {
  const pubs = await prisma.publication.findMany({
    where: { postId },
    select: { status: true },
  });
  if (pubs.length === 0) return;

  const allPublished = pubs.every((p) => p.status === "PUBLISHED");
  const anyPublished = pubs.some((p) => p.status === "PUBLISHED");
  const anyActive = pubs.some((p) => ACTIVE.includes(p.status));

  let status: PostStatus;
  if (allPublished) status = PostStatus.PUBLISHED;
  else if (anyActive) status = PostStatus.PUBLISHING;
  else if (anyPublished) status = PostStatus.PARTIALLY_PUBLISHED;
  else status = PostStatus.FAILED;

  await prisma.post.update({ where: { id: postId }, data: { status } });
}
