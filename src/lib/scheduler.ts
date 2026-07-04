import { PublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPublishQueue } from "@/lib/queue";

const JOB_OPTS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 60_000 },
  removeOnComplete: 500,
  removeOnFail: 1000,
};

function jobIdFor(publicationId: string) {
  return `pub_${publicationId}`;
}

/**
 * Schedule (or reschedule) a publication. Returns whether it was queued —
 * when Redis isn't configured the publication stays PENDING.
 */
export async function enqueuePublication(publicationId: string, when: Date) {
  const queue = getPublishQueue();
  if (!queue) return { queued: false as const };

  const jobId = jobIdFor(publicationId);
  // Remove any existing job so a reschedule takes effect.
  const existing = await queue.getJob(jobId);
  if (existing) {
    try {
      await existing.remove();
    } catch {
      // ignore (may be locked/active)
    }
  }

  const delay = Math.max(0, when.getTime() - Date.now());
  const job = await queue.add(
    "publish",
    { publicationId },
    { ...JOB_OPTS, delay, jobId },
  );

  await prisma.publication.update({
    where: { id: publicationId },
    data: { status: PublicationStatus.QUEUED, jobId: job.id ?? jobId },
  });

  return { queued: true as const, jobId: job.id };
}

export async function cancelPublicationJob(publicationId: string) {
  const queue = getPublishQueue();
  if (!queue) return;
  const job = await queue.getJob(jobIdFor(publicationId));
  if (job) {
    try {
      await job.remove();
    } catch {
      // ignore
    }
  }
}
