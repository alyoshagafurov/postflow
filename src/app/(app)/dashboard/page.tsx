import Link from "next/link";
import type { Metadata } from "next";
import { PublicationStatus } from "@prisma/client";
import {
  AtSign,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Inbox,
  PlusCircle,
  Rocket,
} from "lucide-react";

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Дашборд" };

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const userId = sessionUser.id;

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const [user, subscription, accountsCount, scheduledCount, publishedToday, recent] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { onboardedAt: true, name: true },
      }),
      prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      }),
      prisma.socialAccount.count({ where: { userId } }),
      prisma.publication.count({
        where: {
          userId,
          status: {
            in: [
              PublicationStatus.PENDING,
              PublicationStatus.QUEUED,
              PublicationStatus.PROCESSING,
            ],
          },
        },
      }),
      prisma.publication.count({
        where: {
          userId,
          status: PublicationStatus.PUBLISHED,
          publishedAt: { gte: startToday },
        },
      }),
      prisma.publication.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          post: { select: { title: true } },
          socialAccount: { select: { platform: true, username: true } },
        },
      }),
    ]);

  const firstName = (user?.name ?? sessionUser.name ?? "").split(" ")[0] ?? "";
  const planName = subscription?.plan?.name ?? "Free";

  const stats = [
    { label: "Подключено аккаунтов", value: accountsCount, icon: AtSign, href: "/accounts" },
    { label: "В очереди", value: scheduledCount, icon: CalendarClock, href: "/calendar" },
    { label: "Опубликовано сегодня", value: publishedToday, icon: CheckCircle2, href: "/calendar" },
    { label: "Тариф", value: planName, icon: CreditCard, href: "/billing" },
  ];

  return (
    <div>
      <PageHeader
        title={`Привет${firstName ? `, ${firstName}` : ""} 👋`}
        description="Обзор ваших публикаций и подключённых аккаунтов."
      >
        <Button asChild>
          <Link href="/posts/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Создать пост
          </Link>
        </Button>
      </PageHeader>

      {!user?.onboardedAt && (
        <Alert className="mb-8 border-primary/30 bg-primary/5">
          <Rocket className="h-4 w-4 text-primary" />
          <AlertTitle>Завершите настройку</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Подключите первый аккаунт соцсети, чтобы начать публиковать.
            </span>
            <Button asChild size="sm" variant="secondary">
              <Link href="/onboarding">Продолжить онбординг</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {s.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{s.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Последние публикации</h2>
        {recent.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Пока нет публикаций</p>
                <p className="text-sm text-muted-foreground">
                  Создайте первый пост — он появится здесь.
                </p>
              </div>
              <Button asChild>
                <Link href="/posts/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Создать пост
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {recent.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.post?.title || "Без названия"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.platform}
                      {p.socialAccount?.username
                        ? ` · ${p.socialAccount.username}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
