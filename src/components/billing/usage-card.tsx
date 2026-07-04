"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export function UsageCard({
  planName,
  tier,
  used,
  limit,
  min,
  max,
  customLimit,
}: {
  planName: string;
  tier: string;
  used: number;
  limit: number | null;
  min: number | null;
  max: number | null;
  customLimit: number | null;
}) {
  const router = useRouter();
  const isPro = tier === "PRO" && min != null && max != null;
  const [value, setValue] = useState<number>(customLimit ?? limit ?? min ?? 3);
  const [saving, setSaving] = useState(false);

  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  async function saveLimit(v: number) {
    setSaving(true);
    try {
      const res = await fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDailyLimit: v }),
      });
      if (!res.ok) throw new Error();
      toast.success("Лимит обновлён");
      router.refresh();
    } catch {
      toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Текущий тариф
        </CardTitle>
        <Badge variant="secondary" className="text-sm">
          {planName}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Сегодня опубликовано</span>
            <span className="font-medium">
              {used}
              {limit != null ? ` из ${limit}` : " · без лимита"}
            </span>
          </div>
          <Progress value={limit != null ? pct : 100} />
        </div>

        {isPro && (
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">
                Публикаций в день: {value}
              </span>
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <Slider
              min={min ?? 3}
              max={max ?? 6}
              step={1}
              value={[value]}
              onValueChange={([v]) => setValue(v)}
              onValueCommit={([v]) => saveLimit(v)}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{min}</span>
              <span>{max}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
