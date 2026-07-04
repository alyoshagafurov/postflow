import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformIcon } from "@/components/brand/platform-icon";
import { PLATFORM_META } from "@/lib/platforms";

export const metadata: Metadata = { title: "Ошибки · Админка" };

export default async function AdminErrorsPage() {
  const failed = await prisma.publication.findMany({
    where: { status: "FAILED" },
    include: {
      user: { select: { email: true } },
      post: { select: { title: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  if (failed.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Ошибок публикаций нет 🎉
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {failed.map((p) => (
          <div key={p.id} className="flex items-start gap-3 p-4">
            <span
              className="mt-0.5"
              style={{ color: PLATFORM_META[p.platform].color }}
            >
              <PlatformIcon platform={p.platform} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-medium">
                  {p.post?.title || "Без названия"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.user?.email}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-destructive">
                {p.errorCode ? `[${p.errorCode}] ` : ""}
                {p.errorMessage || "Неизвестная ошибка"}
              </p>
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDistanceToNow(p.updatedAt, { addSuffix: true, locale: ru })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
