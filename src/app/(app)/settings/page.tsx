import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";

export const metadata: Metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, timezone: true, passwordHash: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Настройки"
        description="Профиль, часовой пояс и безопасность."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Профиль</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              initialName={user?.name ?? ""}
              email={user?.email ?? ""}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Часовой пояс</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Определяется автоматически по вашему браузеру и используется для
              расписания публикаций и подсчёта дневного лимита.
            </p>
            <p className="mt-2 font-medium">{user?.timezone ?? "UTC"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Безопасность</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm hasPassword={Boolean(user?.passwordHash)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
