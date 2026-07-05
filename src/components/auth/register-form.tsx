"use client";

import Link from "next/link";
import { GoogleButton } from "@/components/auth/google-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Создать аккаунт</CardTitle>
        <CardDescription>
          Бесплатно. Регистрация в один клик через Google.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {googleEnabled ? (
          <GoogleButton
            callbackUrl="/onboarding"
            label="Продолжить с Google"
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Регистрация через Google пока не настроена.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-xs text-muted-foreground">
          Продолжая, вы соглашаетесь с{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            условиями
          </Link>{" "}
          и{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            политикой конфиденциальности
          </Link>
          .
        </p>
      </CardFooter>
    </Card>
  );
}
