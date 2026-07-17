import { Suspense } from "react";
import type { Metadata } from "next";
import { Plus, RefreshCw } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PLATFORM_META } from "@/lib/platforms";
import { listConnectableProviders } from "@/providers/ui";
import { CAPABILITY_LABELS } from "@/lib/capability-labels";
import { PageHeader } from "@/components/app/page-header";
import { PlatformIcon } from "@/components/brand/platform-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisconnectButton } from "@/components/accounts/disconnect-button";
import { AccountsToaster } from "@/components/accounts/accounts-toaster";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Мои аккаунты" };

const STATUS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Активен", className: "bg-success/15 text-success" },
  EXPIRED: { label: "Токен истёк", className: "bg-warning/15 text-warning" },
  PENDING_VERIFICATION: {
    label: "Ожидает верификации",
    className: "bg-primary/15 text-primary",
  },
  REVOKED: { label: "Отозван", className: "bg-destructive/15 text-destructive" },
};

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await prisma.socialAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const providers = listConnectableProviders();
  const configuredSet = new Set(
    providers.filter((p) => p.configured).map((p) => p.platform),
  );

  return (
    <div>
      <Suspense>
        <AccountsToaster />
      </Suspense>
      <PageHeader
        title="Мои аккаунты"
        description="Подключайте аккаунты соцсетей — публикуйте в них одним постом."
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <span
                className="grid h-12 w-12 place-items-center rounded-xl"
                style={{ color: p.color, background: `${p.color}20` }}
              >
                <PlatformIcon platform={p.platform} className="h-6 w-6" />
              </span>
              <div className="font-medium">{p.label}</div>
              <div className="flex flex-wrap justify-center gap-1">
                {p.capabilities.slice(0, 4).map((c) => (
                  <span
                    key={c}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {CAPABILITY_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
              {p.configured ? (
                <Button asChild size="sm" className="w-full">
                  <a href={`/api/connect/${p.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Подключить
                  </a>
                </Button>
              ) : (
                <div className="w-full space-y-1">
                  <Button size="sm" variant="secondary" className="w-full" disabled>
                    Не настроено
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Требуется настройка интеграции
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold">Подключённые аккаунты</h2>
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Пока нет подключённых аккаунтов. Подключите первый выше.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => {
            const meta = PLATFORM_META[a.platform];
            const st = STATUS[a.status] ?? STATUS.ACTIVE;
            return (
              <Card key={a.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={a.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {(a.displayName || a.username || "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span style={{ color: meta.color }}>
                        <PlatformIcon
                          platform={a.platform}
                          className="h-4 w-4"
                        />
                      </span>
                      <span className="truncate font-medium">
                        {a.displayName || a.username || meta.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className={cn("rounded px-1.5 py-0.5", st.className)}>
                        {st.label}
                      </span>
                      {a.username && (
                        <span className="text-muted-foreground">
                          @{a.username.replace(/^@/, "")}
                        </span>
                      )}
                    </div>
                  </div>
                  {a.status === "EXPIRED" && configuredSet.has(a.platform) && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/connect/${a.platform.toLowerCase()}`}>
                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                        Переподключить
                      </a>
                    </Button>
                  )}
                  <DisconnectButton
                    accountId={a.id}
                    name={a.displayName || a.username || meta.label}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
