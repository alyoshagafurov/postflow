import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { PostEditor } from "@/components/posts/post-editor";

export const metadata: Metadata = { title: "Создать пост" };

export default async function NewPostPage() {
  const user = await requireUser();
  const accounts = await prisma.socialAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      platform: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      status: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Создать пост"
        description="Загрузите видео, выберите обложку и настройте публикацию."
      />
      <PostEditor accounts={accounts} />
    </div>
  );
}
