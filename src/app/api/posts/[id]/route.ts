import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { updatePostSchema } from "@/lib/validations/post";
import { writeAudit } from "@/lib/audit";
import { enqueuePublication, cancelPublicationJob } from "@/lib/scheduler";
import { errorJson, json } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const post = await prisma.post.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      targets: { include: { socialAccount: true } },
      coverOptions: { orderBy: { timestampSec: "asc" } },
      publications: true,
    },
  });
  if (!post) return errorJson("Пост не найден", 404);

  return json({
    post: {
      ...post,
      videoSizeBytes: post.videoSizeBytes ? Number(post.videoSizeBytes) : null,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);
  const userId = session.user.id;

  const post = await prisma.post.findFirst({
    where: { id: params.id, userId },
    include: { targets: true },
  });
  if (!post) return errorJson("Пост не найден", 404);

  const priorPubs = await prisma.publication.findMany({
    where: { postId: post.id },
    select: { id: true },
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }
  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) return errorJson("Некорректные данные", 400);
  const input = parsed.data;

  // Desired target accounts (per-platform or simple mode)
  let desired:
    | { accountId: string; title?: string | null; caption?: string | null; hashtags?: string | null }[]
    | null = null;
  if (input.targets) {
    desired = input.targets.map((t) => ({
      accountId: t.socialAccountId,
      title: t.title ?? null,
      caption: t.caption ?? null,
      hashtags: t.hashtags ?? null,
    }));
  } else if (input.targetAccountIds) {
    desired = input.targetAccountIds.map((id) => ({ accountId: id }));
  }

  // Validate account ownership
  const platformById = new Map<string, string>();
  if (desired) {
    const ids = [...new Set(desired.map((d) => d.accountId))];
    const owned = await prisma.socialAccount.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true, platform: true },
    });
    if (owned.length !== ids.length) {
      return errorJson("Выбраны недоступные аккаунты", 400);
    }
    owned.forEach((a) => platformById.set(a.id, a.platform));
  }

  // Scheduling intent
  const scheduledAt =
    input.scheduledAt != null ? new Date(input.scheduledAt) : undefined;

  // Guardrails when scheduling
  if (input.status === "SCHEDULED") {
    if (!post.videoKey) return errorJson("Сначала загрузите видео", 400);
    const hasConsent = input.consent === true || post.consentAt != null;
    if (!hasConsent) return errorJson("Требуется согласие на публикацию", 400);
    const targetCount = desired ? desired.length : post.targets.length;
    if (targetCount < 1) return errorJson("Выберите хотя бы один аккаунт", 400);
    if (!input.publishNow && scheduledAt == null && post.scheduledAt == null) {
      return errorJson("Укажите дату публикации", 400);
    }
  }

  // Scalar updates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.hashtags !== undefined) data.hashtags = input.hashtags;
  if (input.perPlatformText !== undefined)
    data.perPlatformText = input.perPlatformText;
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.coverKey !== undefined) {
    data.coverKey = input.coverKey;
    data.coverUrl = input.coverKey ? storage.publicUrl(input.coverKey) : null;
  }
  if (input.consent === true && !post.consentAt) data.consentAt = new Date();
  if (input.publishNow === true) {
    data.publishNow = true;
    data.scheduledAt = null;
  } else if (scheduledAt !== undefined) {
    data.publishNow = false;
    data.scheduledAt = scheduledAt;
  }
  if (input.status) data.status = input.status;

  const finalStatus = input.status ?? post.status;

  await prisma.$transaction(async (tx) => {
    await tx.post.update({ where: { id: post.id }, data });

    if (desired) {
      await tx.postTarget.deleteMany({
        where: {
          postId: post.id,
          socialAccountId: { notIn: desired.map((d) => d.accountId) },
        },
      });
      for (const d of desired) {
        await tx.postTarget.upsert({
          where: {
            postId_socialAccountId: {
              postId: post.id,
              socialAccountId: d.accountId,
            },
          },
          update: {
            title: d.title ?? null,
            caption: d.caption ?? null,
            hashtags: d.hashtags ?? null,
          },
          create: {
            postId: post.id,
            socialAccountId: d.accountId,
            title: d.title ?? null,
            caption: d.caption ?? null,
            hashtags: d.hashtags ?? null,
          },
        });
      }
    }

    if (finalStatus === "SCHEDULED") {
      const targets = await tx.postTarget.findMany({
        where: { postId: post.id },
        include: { socialAccount: { select: { platform: true } } },
      });
      const when =
        input.publishNow === true
          ? new Date()
          : (scheduledAt ?? post.scheduledAt ?? new Date());
      const targetIds = targets.map((t) => t.id);
      await tx.publication.deleteMany({
        where: {
          postId: post.id,
          postTargetId: { notIn: targetIds },
          status: { in: ["PENDING", "QUEUED"] },
        },
      });
      for (const t of targets) {
        await tx.publication.upsert({
          where: { postTargetId: t.id },
          update: { scheduledAt: when, platform: t.socialAccount.platform },
          create: {
            postId: post.id,
            postTargetId: t.id,
            socialAccountId: t.socialAccountId,
            userId,
            platform: t.socialAccount.platform,
            scheduledAt: when,
            status: "PENDING",
          },
        });
      }
    } else if (finalStatus === "DRAFT") {
      await tx.publication.deleteMany({
        where: { postId: post.id, status: { in: ["PENDING", "QUEUED"] } },
      });
    }
  });

  // Queue (or cancel) delayed publish jobs once the DB is consistent.
  if (finalStatus === "SCHEDULED") {
    const pubs = await prisma.publication.findMany({
      where: { postId: post.id, status: { in: ["PENDING", "QUEUED"] } },
      select: { id: true, scheduledAt: true },
    });
    await Promise.all(
      pubs.map((p) => enqueuePublication(p.id, p.scheduledAt ?? new Date())),
    );
  } else if (finalStatus === "DRAFT") {
    await Promise.all(priorPubs.map((p) => cancelPublicationJob(p.id)));
  }

  if (input.status === "SCHEDULED") {
    await writeAudit({
      userId,
      action: "post.schedule",
      targetType: "Post",
      targetId: post.id,
    });
  }

  return json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);
  const userId = session.user.id;

  const post = await prisma.post.findFirst({
    where: { id: params.id, userId },
    include: { coverOptions: true },
  });
  if (!post) return errorJson("Пост не найден", 404);

  const pubs = await prisma.publication.findMany({
    where: { postId: post.id },
    select: { id: true },
  });
  await Promise.all(pubs.map((p) => cancelPublicationJob(p.id)));

  // Best-effort storage cleanup
  const keys = [
    post.videoKey,
    post.coverKey,
    ...post.coverOptions.map((c) => c.key),
  ].filter((k): k is string => Boolean(k));
  await Promise.allSettled(keys.map((k) => storage.delete(k)));

  await prisma.post.delete({ where: { id: post.id } });
  await writeAudit({
    userId,
    action: "post.delete",
    targetType: "Post",
    targetId: post.id,
  });

  return json({ ok: true });
}
