import { NotificationType, type Platform } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail, emailLayout } from "@/lib/email";
import { platformLabel } from "@/lib/platforms";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });
}

export async function notifyPublication(input: {
  userId: string;
  success: boolean;
  platform: Platform;
  postTitle?: string | null;
  url?: string | null;
  error?: string;
}) {
  const label = platformLabel(input.platform);
  const title = input.success
    ? `Опубликовано в ${label}`
    : `Ошибка публикации в ${label}`;
  const body = input.success
    ? input.postTitle || "Ваше видео опубликовано."
    : `${input.postTitle || "Видео"}: ${input.error || "не удалось опубликовать"}`;

  await createNotification({
    userId: input.userId,
    type: input.success
      ? NotificationType.PUBLISH_SUCCESS
      : NotificationType.PUBLISH_FAILED,
    title,
    body,
    link: input.url ?? "/calendar",
  });

  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true },
    });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: title,
        html: emailLayout(
          title,
          `<p>${body}</p>${
            input.url
              ? `<p style="margin-top:16px"><a href="${input.url}" style="color:#7C5CFF">Открыть публикацию</a></p>`
              : ""
          }`,
        ),
      });
    }
  } catch {
    // email is best-effort
  }
}
