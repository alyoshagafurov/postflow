/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { Inbox, PlusCircle } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformIcon } from "@/components/brand/platform-icon";
import { PLATFORM_META } from "@/lib/platforms";
import { DeletePostButton } from "@/components/posts/delete-post-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Посты" };

const POST_STATUS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Черновик", className: "bg-muted text-muted-foreground" },
  SCHEDULED: { label: "Запланирован", className: "bg-primary/15 text-primary" },
  PUBLISHING: { label: "Публикуется", className: "bg-warning/15 text-warning" },
  PUBLISHED: { label: "Опубликован", className: "bg-success/15 text-success" },
  PARTIALLY_PUBLISHED: {
    label: "Частично",
    className: "bg-warning/15 text-warning",
  },
  FAILED: { label: "Ошибка", className: "bg-destructive/15 text-destructive" },
};

export default async function PostsPage() {
  const user = await requireUser();
  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      targets: { include: { socialAccount: { select: { platform: true } } } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Посты"
        description="Черновики и запланированные публикации."
      >
        <Button asChild>
          <Link href="/posts/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Создать пост
          </Link>
        </Button>
      </PageHeader>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Пока нет постов</p>
              <p className="text-sm text-muted-foreground">
                Создайте первый пост, чтобы начать публиковать.
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
        <div className="space-y-3">
          {posts.map((p) => {
            const st = POST_STATUS[p.status] ?? POST_STATUS.DRAFT;
            const platforms = [
              ...new Set(p.targets.map((t) => t.socialAccount.platform)),
            ];
            return (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    {p.coverUrl && (
                      <img
                        src={p.coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {p.title || "Без названия"}
                      </p>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs",
                          st.className,
                        )}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {platforms.map((pl) => (
                        <span key={pl} style={{ color: PLATFORM_META[pl].color }}>
                          <PlatformIcon platform={pl} className="h-3.5 w-3.5" />
                        </span>
                      ))}
                      {p.scheduledAt && (
                        <span>
                          · {new Date(p.scheduledAt).toLocaleString("ru-RU")}
                        </span>
                      )}
                      {p.publishNow && !p.scheduledAt && (
                        <span>· как можно скорее</span>
                      )}
                    </div>
                  </div>
                  <DeletePostButton postId={p.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
