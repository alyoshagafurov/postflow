"use client";

import { useRef, useState } from "react";
import { Film, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-client";
import { MAX_VIDEO_BYTES, VIDEO_MIME } from "@/lib/validations/post";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function VideoUploader({
  onUploaded,
}: {
  onUploaded: (data: { key: string; previewUrl: string; file: File }) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!(VIDEO_MIME as readonly string[]).includes(file.type)) {
      toast.error("Поддерживаются MP4, MOV и WEBM");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Файл больше 512 МБ");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setProgress(0);
    try {
      const { key } = await uploadFile(file, "video", setProgress);
      setProgress(100);
      onUploaded({ key, previewUrl: url, file });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
      setProgress(null);
      setPreview(null);
    }
  }

  if (preview) {
    return (
      <div className="space-y-3">
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-xl border border-border bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={preview}
            controls
            className="h-full w-full object-contain"
          />
        </div>
        {progress !== null && progress < 100 && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-center text-xs text-muted-foreground">
              Загрузка… {progress}%
            </p>
          </div>
        )}
        {progress === 100 && (
          <p className="flex items-center justify-center gap-2 text-center text-xs text-success">
            <Film className="h-3.5 w-3.5" /> Видео загружено
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void handleFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
        drag
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-accent/30",
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
        {progress !== null ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <UploadCloud className="h-6 w-6" />
        )}
      </div>
      <div>
        <p className="font-medium">Перетащите видео сюда</p>
        <p className="text-sm text-muted-foreground">
          или нажмите, чтобы выбрать файл — MP4, MOV, WEBM до 512 МБ
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
    </div>
  );
}
