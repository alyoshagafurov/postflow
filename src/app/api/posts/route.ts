import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createPostSchema } from "@/lib/validations/post";
import { storage } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";
import { errorJson, json } from "@/lib/api";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) return errorJson("Некорректные данные", 400);

  const { videoKey, videoMime, videoSizeBytes } = parsed.data;
  if (!videoKey.startsWith(`uploads/${userId}/videos/`)) {
    return errorJson("Некорректный ключ видео", 400);
  }

  const post = await prisma.post.create({
    data: {
      userId,
      videoKey,
      videoUrl: storage.publicUrl(videoKey),
      videoMime: videoMime ?? null,
      videoSizeBytes:
        typeof videoSizeBytes === "number" ? BigInt(videoSizeBytes) : null,
      status: "DRAFT",
    },
  });

  await writeAudit({
    userId,
    action: "post.create",
    targetType: "Post",
    targetId: post.id,
  });

  return json({ id: post.id }, 201);
}
