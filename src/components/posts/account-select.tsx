"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { Platform } from "@prisma/client";
import { PlatformIcon } from "@/components/brand/platform-icon";
import { PLATFORM_META } from "@/lib/platforms";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SelectableAccount = {
  id: string;
  platform: Platform;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  status: string;
};

export function AccountSelect({
  accounts,
  value,
  onChange,
}: {
  accounts: SelectableAccount[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Нет подключённых аккаунтов.
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-3">
          <Link href="/accounts">Подключить аккаунт</Link>
        </Button>
      </div>
    );
  }

  const toggle = (id: string) =>
    value.includes(id)
      ? onChange(value.filter((v) => v !== id))
      : onChange([...value, id]);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {accounts.map((a) => {
        const meta = PLATFORM_META[a.platform];
        const active = value.includes(a.id);
        return (
          <button
            type="button"
            key={a.id}
            onClick={() => toggle(a.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left transition",
              active
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent/40",
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={a.avatarUrl ?? undefined} />
              <AvatarFallback>
                {(a.displayName || a.username || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <span style={{ color: meta.color }}>
                  <PlatformIcon platform={a.platform} className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">
                  {a.displayName || a.username || meta.label}
                </span>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {a.username
                  ? `@${a.username.replace(/^@/, "")}`
                  : meta.label}
                {a.status !== "ACTIVE" && " · требует внимания"}
              </div>
            </div>
            <span
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {active && <Check className="h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
