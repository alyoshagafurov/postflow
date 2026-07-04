import crypto from "node:crypto";
import { getSession } from "@/lib/session";
import { storage } from "@/lib/storage";
import {
  IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MIME_EXT,
  VIDEO_MIME,
  presignSchema,
} from "@/lib/validations/post";
import { errorJson, json } from "@/lib/api";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson("Некорректный запрос", 400);
  }

  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) return errorJson("Некорректные параметры файла", 400);

  const { kind, filename, contentType, size } = parsed.data;
  const allowed: readonly string[] = kind === "video" ? VIDEO_MIME : IMAGE_MIME;
  const maxBytes = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  if (!allowed.includes(contentType)) {
    return errorJson("Неподдерживаемый формат файла", 415);
  }
  if (size > maxBytes) {
    return errorJson(
      `Файл слишком большой (макс ${Math.round(maxBytes / 1024 / 1024)} МБ)`,
      413,
    );
  }

  const ext =
    MIME_EXT[contentType] ||
    (filename.includes(".") ? filename.split(".").pop() : "bin") ||
    "bin";
  const folder = kind === "video" ? "videos" : "covers";
  const key = `uploads/${session.user.id}/${folder}/${crypto
    .randomBytes(12)
    .toString("hex")}.${ext}`;

  const presigned = await storage.presignUpload({ key, contentType });
  return json(presigned);
}
