"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function useAction(id: string, action: "retry" | "cancel") {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function run() {
    setLoading(true);
    try {
      const res = await fetch(`/api/publications/${id}/${action}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success(action === "retry" ? "Повтор запущен" : "Отменено");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }
  return { loading, run };
}

export function RetryButton({ id }: { id: string }) {
  const { loading, run } = useAction(id, "retry");
  return (
    <Button size="sm" variant="outline" onClick={run} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : (
        <RotateCw className="mr-2 h-3.5 w-3.5" />
      )}
      Повторить
    </Button>
  );
}

export function CancelButton({ id }: { id: string }) {
  const { loading, run } = useAction(id, "cancel");
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={run}
      disabled={loading}
      className="text-muted-foreground hover:text-destructive"
    >
      {loading ? (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : (
        <X className="mr-2 h-3.5 w-3.5" />
      )}
      Отменить
    </Button>
  );
}
