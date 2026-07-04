import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generateCovers } from "@/lib/video/covers";
import { errorJson, json } from "@/lib/api";

// ffmpeg frame extraction can take a few seconds on larger clips.
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);
  const userId = session.user.id;

  const post = await prisma.post.findFirst({
    where: { id: params.id, userId },
    select: { id: true, videoKey: true },
  });
  if (!post) return errorJson("Пост не найден", 404);
  if (!post.videoKey) return errorJson("Видео не загружено", 400);

  try {
    const { probe, covers } = await generateCovers(post.videoKey, userId, 4);

    await prisma.$transaction(async (tx) => {
      await tx.coverOption.deleteMany({
        where: { postId: post.id, isCustom: false },
      });
      await tx.post.update({
        where: { id: post.id },
        data: {
          videoDurationSec: probe.durationSec || null,
          videoWidth: probe.width || null,
          videoHeight: probe.height || null,
        },
      });
      for (const c of covers) {
        await tx.coverOption.create({
          data: {
            postId: post.id,
            key: c.key,
            url: c.url,
            timestampSec: c.timestampSec,
            isCustom: false,
          },
        });
      }
    });

    return json({ covers, probe });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[covers] generation failed", err);
    return errorJson("Не удалось сгенерировать кадры из видео", 500);
  }
}
