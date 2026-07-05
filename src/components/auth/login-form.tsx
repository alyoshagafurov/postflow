"use client";

import { GoogleButton } from "@/components/auth/google-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm({
  googleEnabled,
  callbackUrl,
}: {
  googleEnabled: boolean;
  callbackUrl: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Вход в PostFlow</CardTitle>
        <CardDescription>
          Войдите через Google — быстро, без пароля.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {googleEnabled ? (
          <GoogleButton callbackUrl={callbackUrl} label="Войти через Google" />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Вход через Google пока не настроен.
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Первый вход автоматически создаёт аккаунт.
        </p>
      </CardContent>
    </Card>
  );
}
