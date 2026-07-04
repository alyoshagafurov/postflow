"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export function PromoToggle({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [val, setVal] = useState(active);
  const [loading, setLoading] = useState(false);

  async function toggle(next: boolean) {
    setLoading(true);
    setVal(next);
    try {
      const res = await fetch(`/api/admin/promos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Активирован" : "Деактивирован");
      router.refresh();
    } catch {
      setVal(!next);
      toast.error("Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return <Switch checked={val} disabled={loading} onCheckedChange={toggle} />;
}
