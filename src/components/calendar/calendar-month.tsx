import Link from "next/link";
import type { Platform, PublicationStatus } from "@prisma/client";
import { PlatformIcon } from "@/components/brand/platform-icon";
import { PLATFORM_META } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export type CalendarChip = {
  id: string;
  postId: string;
  platform: Platform;
  status: PublicationStatus;
  title: string;
};

export type CalendarCell = {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  items: CalendarChip[];
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const STATUS_DOT: Record<PublicationStatus, string> = {
  PENDING: "bg-muted-foreground",
  QUEUED: "bg-primary",
  PROCESSING: "bg-warning",
  PUBLISHED: "bg-success",
  FAILED: "bg-destructive",
  CANCELED: "bg-muted-foreground/40",
};

export function CalendarMonth({ cells }: { cells: CalendarCell[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-card/40 text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c, i) => (
          <div
            key={c.key}
            className={cn(
              "min-h-[92px] border-b border-r border-border p-1.5",
              i % 7 === 6 && "border-r-0",
              i >= 35 && "border-b-0",
              !c.inMonth && "bg-background/40",
            )}
          >
            <div
              className={cn(
                "mb-1 text-xs",
                c.isToday
                  ? "inline-grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"
                  : c.inMonth
                    ? "text-foreground"
                    : "text-muted-foreground/40",
              )}
            >
              {c.day}
            </div>
            <div className="space-y-1">
              {c.items.slice(0, 3).map((it) => (
                <Link
                  key={it.id}
                  href={`/posts/${it.postId}`}
                  className="flex items-center gap-1 truncate rounded bg-card px-1 py-0.5 text-[11px] hover:bg-accent"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      STATUS_DOT[it.status],
                    )}
                  />
                  <span style={{ color: PLATFORM_META[it.platform].color }}>
                    <PlatformIcon platform={it.platform} className="h-3 w-3" />
                  </span>
                  <span className="truncate text-muted-foreground">
                    {it.title}
                  </span>
                </Link>
              ))}
              {c.items.length > 3 && (
                <div className="px-1 text-[10px] text-muted-foreground">
                  +{c.items.length - 3}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
