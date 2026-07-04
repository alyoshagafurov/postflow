"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function CreatePromoForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [unlimited, setUnlimited] = useState(true);
  const [percent, setPercent] = useState("");
  const [maxR, setMaxR] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: {
        code: string;
        grantsUnlimited: boolean;
        percentOff?: number;
        maxRedemptions?: number;
      } = { code, grantsUnlimited: unlimited };
      if (!unlimited && percent) body.percentOff = Number(percent);
      if (maxR) body.maxRedemptions = Number(maxR);

      const res = await fetch("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success("Промокод создан");
      setCode("");
      setPercent("");
      setMaxR("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label>Код</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="SUMMER2026"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Скидка %</Label>
        <Input
          type="number"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          placeholder="20"
          disabled={unlimited}
        />
      </div>
      <div className="space-y-2">
        <Label>Лимит активаций</Label>
        <Input
          type="number"
          value={maxR}
          onChange={(e) => setMaxR(e.target.value)}
          placeholder="без лимита"
        />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2 pb-2">
          <Switch
            id="unl"
            checked={unlimited}
            onCheckedChange={setUnlimited}
          />
          <Label htmlFor="unl" className="text-sm">
            Безлимит
          </Label>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
