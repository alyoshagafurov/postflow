"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Behavior = "QUEUE_NEXT_DAY" | "SUGGEST_UPGRADE";

const OPTIONS: {
  value: Behavior;
  title: string;
  desc: string;
  icon: typeof CalendarClock;
}[] = [
  {
    value: "QUEUE_NEXT_DAY",
    title: "Перенести на следующий день",
    desc: "При превышении лимита публикация встанет в очередь на завтра.",
    icon: CalendarClock,
  },
  {
    value: "SUGGEST_UPGRADE",
    title: "Предлагать апгрейд",
    desc: "При превышении лимита публикация не выйдет — предложим обновить тариф.",
    icon: Sparkles,
  },
];

export function LimitBehaviorToggle({ initial }: { initial: Behavior }) {
  const router = useRouter();
  const [value, setValue] = useState<Behavior>(initial);
  const [saving, setSaving] = useState(false);

  async function choose(v: Behavior) {
    if (v === value || saving) return;
    const prev = value;
    setValue(v);
    setSaving(true);
    try {
      const res = await fetch("/api/me/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitBehavior: v }),
      });
      if (!res.ok) throw new Error();
      toast.success("Сохранено");
      router.refresh();
    } catch {
      setValue(prev);
      toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            className={cn(
              "relative rounded-xl border p-4 text-left transition-colors",
              active
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40",
            )}
          >
            {active && (
              <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />
            )}
            <Icon className="mb-2 h-5 w-5 text-primary" />
            <div className="font-medium">{o.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
