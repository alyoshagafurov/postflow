import Link from "next/link";
import type { Metadata } from "next";
import {
  addDays,
  addMonths,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformIcon } from "@/components/brand/platform-icon";
import { PLATFORM_META } from "@/lib/platforms";
import {
  CalendarMonth,
  type CalendarCell,
  type CalendarChip,
} from "@/components/calendar/calendar-month";
import {
  CancelButton,
  RetryButton,
} from "@/components/calendar/publication-actions";

export const metadata: Metadata = { title: "Календарь" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { timezone: true },
  });
  const tz = dbUser?.timezone || "UTC";

  const valid = searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month);
  const base = valid
    ? new Date(`${searchParams.month}-01T00:00:00`)
    : new Date();
  const monthStart = startOfMonth(base);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = addDays(gridStart, 42);

  const monthPubs = await prisma.publication.findMany({
    where: {
      userId: user.id,
      scheduledAt: { gte: gridStart, lt: gridEnd },
    },
    include: { post: { select: { title: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  const buckets = new Map<string, CalendarChip[]>();
  for (const p of monthPubs) {
    if (!p.scheduledAt) continue;
    const key = formatInTimeZone(p.scheduledAt, tz, "yyyy-MM-dd");
    const arr = buckets.get(key) ?? [];
    arr.push({
      id: p.id,
      postId: p.postId,
      platform: p.platform,
      status: p.status,
      title: p.post?.title || "Без названия",
    });
    buckets.set(key, arr);
  }

  const todayKey = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const key = format(d, "yyyy-MM-dd");
    cells.push({
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === monthStart.getMonth(),
      isToday: key === todayKey,
      items: buckets.get(key) ?? [],
    });
  }

  const prevMonth = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");
  const monthLabel = format(monthStart, "LLLL yyyy", { locale: ru });

  const [queued, failed] = await Promise.all([
    prisma.publication.findMany({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "QUEUED", "PROCESSING"] },
      },
      include: {
        post: { select: { title: true } },
        socialAccount: { select: { username: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    }),
    prisma.publication.findMany({
      where: { userId: user.id, status: "FAILED" },
      include: {
        post: { select: { title: true } },
        socialAccount: { select: { username: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  function Row({
    p,
    action,
  }: {
    p: (typeof queued)[number];
    action: "cancel" | "retry" | null;
  }) {
    return (
      <div className="flex items-center gap-3 p-4">
        <span style={{ color: PLATFORM_META[p.platform].color }}>
          <PlatformIcon platform={p.platform} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/posts/${p.postId}`}
            className="truncate font-medium hover:underline"
          >
            {p.post?.title || "Без названия"}
          </Link>
          <div className="text-xs text-muted-foreground">
            {p.scheduledAt
              ? formatInTimeZone(p.scheduledAt, tz, "d MMM, HH:mm", {
                  locale: ru,
                })
              : "—"}
            {p.socialAccount?.username ? ` · @${p.socialAccount.username.replace(/^@/, "")}` : ""}
          </div>
          {p.errorMessage && (
            <div className="mt-1 text-xs text-destructive">{p.errorMessage}</div>
          )}
        </div>
        <StatusBadge status={p.status} />
        {action === "cancel" && <CancelButton id={p.id} />}
        {action === "retry" && <RetryButton id={p.id} />}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Календарь"
        description="Запланированные и опубликованные посты."
      >
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon">
            <Link href={`/calendar?month=${prevMonth}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize">
            {monthLabel}
          </span>
          <Button asChild variant="outline" size="icon">
            <Link href={`/calendar?month=${nextMonth}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </PageHeader>

      <CalendarMonth cells={cells} />

      {failed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Ошибки публикации</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {failed.map((p) => (
                <Row key={p.id} p={p} action="retry" />
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">В очереди</h2>
        {queued.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Нет запланированных публикаций.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {queued.map((p) => (
                <Row key={p.id} p={p} action="cancel" />
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
