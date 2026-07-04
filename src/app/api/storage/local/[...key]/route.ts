import { getSession } from "@/lib/session";
import { storage } from "@/lib/storage";
import { errorJson, json } from "@/lib/api";

// Local-disk storage endpoint used only when S3/R2 is not configured (dev).

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function keyFromParams(params: { key?: string[] }): string {
  return (params.key ?? []).join("/");
}

export async function GET(
  _req: Request,
  { params }: { params: { key?: string[] } },
) {
  const key = keyFromParams(params);
  try {
    const buf = await storage.readObject(key);
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    const type = MIME[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return errorJson("Файл не найден", 404);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { key?: string[] } },
) {
  const session = await getSession();
  if (!session?.user?.id) return errorJson("Не авторизован", 401);

  const key = keyFromParams(params);
  if (!key.startsWith(`uploads/${session.user.id}/`)) {
    return errorJson("Доступ запрещён", 403);
  }

  const contentType =
    req.headers.get("content-type") ?? "application/octet-stream";
  const buf = Buffer.from(await req.arrayBuffer());
  await storage.putObject(key, buf, contentType);
  return json({ ok: true });
}
