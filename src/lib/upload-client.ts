export type UploadKind = "video" | "cover";

export type UploadResult = { key: string; publicUrl: string };

/**
 * Presign + direct PUT upload with progress. Works with both the S3/R2 and the
 * local-disk backends (the presign response tells us where to PUT).
 */
export async function uploadFile(
  file: File,
  kind: UploadKind,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });
  if (!presignRes.ok) {
    const e = await presignRes.json().catch(() => ({}));
    throw new Error(e.error || "Не удалось начать загрузку");
  }
  const { key, uploadUrl, method, headers, publicUrl } =
    await presignRes.json();

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method || "PUT", uploadUrl);
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        xhr.setRequestHeader(k, v as string);
      }
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Ошибка загрузки файла"));
    xhr.onerror = () => reject(new Error("Сеть недоступна при загрузке"));
    xhr.send(file);
  });

  return { key, publicUrl };
}
