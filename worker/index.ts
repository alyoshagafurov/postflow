import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { addDays } from "date-fns";
import { PublicationStatus, SocialAccountStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  PUBLISH_QUEUE,
  redisConnection,
  type PublishJobData,
} from "@/lib/queue";
import { getPublisher } from "@/lib/publishers";
import { PlatformNotVerifiedError } from "@/lib/publishers/types";
import { ensureFreshTokens } from "@/lib/social-accounts";
import { resolveContent } from "@/lib/publishers/content";
import { recomputePostStatus } from "@/lib/posts";
import { notifyPublication } from "@/lib/notifications";
import { enqueuePublication } from "@/lib/scheduler";
import { checkCanPublish, incrementUsage, usageDate } from "@/lib/billing/limits";

async function processPublication(publicationId: string) {
  const pub = await prisma.publication.findUnique({
    where: { id: publicationId },
    include: { post: true, postTarget: true, socialAccount: true },
  });
  if (!pub) return;
  if (
    pub.status === PublicationStatus.PUBLISHED ||
    pub.status === PublicationStatus.CANCELED
  ) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: pub.userId },
    select: { timezone: true, limitBehavior: true },
  });
  const tz = user?.timezone || "UTC";

  // ---- Daily-limit gate (before counting a processing attempt) ----
  const limit = await checkCanPublish(pub.userId, tz);
  if (!limit.allowed) {
    if (user?.limitBehavior === "QUEUE_NEXT_DAY") {
      const next = addDays(new Date(), 1);
      await prisma.publication.update({
        where: { id: pub.id },
        data: {
          status: PublicationStatus.QUEUED,
          scheduledAt: next,
          errorCode: null,
          errorMessage: "Перенесено на следующий день — достигнут дневной лимит",
        },
      });
      await enqueuePublication(pub.id, next);
      return;
    }
    await prisma.publication.update({
      where: { id: pub.id },
      data: {
        status: PublicationStatus.FAILED,
        errorCode: "LIMIT_REACHED",
        errorMessage: "Достигнут дневной лимит публикаций. Обновите тариф.",
      },
    });
    await recomputePostStatus(pub.postId);
    await notifyPublication({
      userId: pub.userId,
      success: false,
      platform: pub.platform,
      postTitle: pub.post.title,
      error: "Достигнут дневной лимит. Обновите тариф.",
    });
    return;
  }

  await prisma.publication.update({
    where: { id: pub.id },
    data: {
      status: PublicationStatus.PROCESSING,
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  try {
    const publisher = getPublisher(pub.platform);
    if (!publisher || !publisher.isConfigured()) {
      throw new Error(`Интеграция ${pub.platform} не настроена`);
    }
    if (pub.socialAccount.status === SocialAccountStatus.PENDING_VERIFICATION) {
      throw new PlatformNotVerifiedError(pub.platform);
    }
    if (!pub.post.videoKey) throw new Error("У поста нет видео");

    const tokens = await ensureFreshTokens(pub.socialAccount);
    const content = resolveContent(pub.post, pub.postTarget);

    const result = await publisher.publish(
      tokens,
      {
        title: content.title,
        description: content.description,
        caption: content.caption,
        tags: content.tags,
        privacy:
          (pub.postTarget.privacy as "public" | "private" | "unlisted") ||
          "public",
        publishNow: true,
        scheduledAt: pub.scheduledAt,
        videoKey: pub.post.videoKey,
        videoMime: pub.post.videoMime,
      },
      {
        platformAccountId: pub.socialAccount.platformAccountId,
        metadata: pub.socialAccount.metadata,
      },
    );

    if (result.status === "PUBLISHED") {
      await incrementUsage(pub.userId, tz);
    }
    await prisma.publication.update({
      where: { id: pub.id },
      data: {
        status:
          result.status === "PUBLISHED"
            ? PublicationStatus.PUBLISHED
            : PublicationStatus.PROCESSING,
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl ?? null,
        publishedAt: result.status === "PUBLISHED" ? new Date() : null,
        countsAgainstDate: usageDate(tz),
        errorCode: null,
        errorMessage: null,
      },
    });
    await recomputePostStatus(pub.postId);
    await notifyPublication({
      userId: pub.userId,
      success: true,
      platform: pub.platform,
      postTitle: pub.post.title,
      url: result.platformUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка публикации";
    await prisma.publication.update({
      where: { id: pub.id },
      data: {
        status: PublicationStatus.FAILED,
        errorCode:
          e instanceof PlatformNotVerifiedError
            ? "NOT_VERIFIED"
            : "PUBLISH_ERROR",
        errorMessage: message,
      },
    });
    await recomputePostStatus(pub.postId);
    await notifyPublication({
      userId: pub.userId,
      success: false,
      platform: pub.platform,
      postTitle: pub.post.title,
      error: message,
    });
    throw e; // surface to BullMQ for retry/backoff bookkeeping
  }
}

const worker = new Worker<PublishJobData>(
  PUBLISH_QUEUE,
  async (job: Job<PublishJobData>) => {
    await processPublication(job.data.publicationId);
  },
  { connection: redisConnection(), concurrency: 3 },
);

worker.on("completed", (job) => {
  // eslint-disable-next-line no-console
  console.log(`[worker] completed ${job.id}`);
});
worker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`[worker] failed ${job?.id}: ${err?.message}`);
});

// eslint-disable-next-line no-console
console.log("[worker] publish worker started, waiting for jobs…");

async function shutdown() {
  // eslint-disable-next-line no-console
  console.log("[worker] shutting down…");
  await worker.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
