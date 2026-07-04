import type { Metadata } from "next";
import {
  AlertTriangle,
  AtSign,
  CreditCard,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
import { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Админка" };

export default async function AdminOverview() {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const start7 = new Date(Date.now() - 7 * 86_400_000);

  const [
    totalUsers,
    paidUsers,
    publishedToday,
    published7,
    totalAccounts,
    failedCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { tier: { not: PlanTier.FREE } } }),
    prisma.publication.count({
      where: { status: "PUBLISHED", publishedAt: { gte: startToday } },
    }),
    prisma.publication.count({
      where: { status: "PUBLISHED", publishedAt: { gte: start7 } },
    }),
    prisma.socialAccount.count(),
    prisma.publication.count({ where: { status: "FAILED" } }),
  ]);

  const conversion =
    totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0;

  const stats = [
    { label: "Пользователей", value: totalUsers, icon: Users },
    { label: "Платных подписок", value: paidUsers, icon: CreditCard },
    { label: "Конверсия free→paid", value: `${conversion}%`, icon: TrendingUp },
    { label: "Опубликовано сегодня", value: publishedToday, icon: Send },
    { label: "Публикаций за 7 дней", value: published7, icon: Send },
    { label: "Подключено аккаунтов", value: totalAccounts, icon: AtSign },
    { label: "Ошибок публикаций", value: failedCount, icon: AlertTriangle },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.label}>
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
        );
      })}
    </div>
  );
}
