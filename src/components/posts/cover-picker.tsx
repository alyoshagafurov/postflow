"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

export type CoverOption = {
  key: string;
  url: string;
  timestampSec?: number | null;
  isCustom?: boolean;
};

export function CoverPicker({
  covers,
  value,
  onSelect,
  onCustomUploaded,
  generating,
}: {
  covers: CoverOption[];
  value: string | null;
  onSelect: (key: string) => void;
  onCustomUploaded: (c: CoverOption) => void;
  generating: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleCustom(file: File) {
    setUploading(true);
    try {
      const { key, publicUrl } = await uploadFile(file, "cover");
      onCustomUploaded({ key, url: publicUrl, isCustom: true });
      onSelect(key);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {generating &&
        covers.length === 0 &&
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[9/16] animate-pulse rounded-lg bg-muted"
          />
        ))}

      {covers.map((c) => (
        <button
          type="button"
          key={c.key}
          onClick={() => onSelect(c.key)}
          className={cn(
            "relative aspect-[9/16] overflow-hidden rounded-lg border-2 transition",
            value === c.key
              ? "border-primary"
              : "border-transparent hover:border-border",
          )}
        >
          <img src={c.url} alt="Обложка" className="h-full w-full object-cover" />
          {value === c.key && (
            <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3 w-3" />
            </span>
          )}
        </button>
      ))}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex aspect-[9/16] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
        <span className="text-xs">Своя</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleCustom(f);
        }}
      />
    </div>
  );
}
