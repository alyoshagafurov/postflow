"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, MailWarning } from "lucide-react";

import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GoogleButton } from "@/components/auth/google-button";

export function LoginForm({
  googleEnabled,
  callbackUrl,
}: {
  googleEnabled: boolean;
  callbackUrl: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    setUnverifiedEmail(null);
    const res = await signIn("credentials", { ...values, redirect: false });
    setLoading(false);

    if (!res || res.error) {
      if (res?.error && res.error.includes("EMAIL_NOT_VERIFIED")) {
        setUnverifiedEmail(values.email);
        toast.error("Сначала подтвердите email");
      } else {
        toast.error("Неверный email или пароль");
      }
      return;
    }
    toast.success("С возвращением!");
    router.push(callbackUrl);
    router.refresh();
  }

  async function resend() {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      toast.success("Письмо с подтверждением отправлено");
    } catch {
      toast.error("Не удалось отправить");
    } finally {
      setResending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Вход в аккаунт</CardTitle>
        <CardDescription>
          Рады видеть снова. Войдите, чтобы продолжить.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unverifiedEmail && (
          <Alert className="border-warning/40 bg-warning/5">
            <MailWarning className="h-4 w-4 text-warning" />
            <AlertTitle>Email не подтверждён</AlertTitle>
            <AlertDescription className="space-y-2">
              <span>
                Подтвердите адрес по ссылке из письма, чтобы войти.
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={resend}
                disabled={resending}
              >
                {resending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Отправить письмо повторно
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {googleEnabled && (
          <>
            <GoogleButton callbackUrl={callbackUrl} />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">или</span>
              </div>
            </div>
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Пароль</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Забыли пароль?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Войти"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Создать бесплатно
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
