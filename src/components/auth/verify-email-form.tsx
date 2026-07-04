"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function confirm() {
    setState("loading");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setState("done");
    } catch (e) {
      setState("idle");
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
  }

  if (state === "done") {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle>Email подтверждён</CardTitle>
          <CardDescription>
            Теперь вы можете войти в свой аккаунт.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">Войти</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary">
          <MailCheck className="h-6 w-6" />
        </div>
        <CardTitle>Подтверждение email</CardTitle>
        <CardDescription>
          Нажмите кнопку ниже, чтобы подтвердить адрес и активировать аккаунт.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          onClick={confirm}
          disabled={state === "loading"}
        >
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Подтвердить email"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function VerifyEmailInvalid() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Ссылка недействительна</CardTitle>
        <CardDescription>
          Ссылка для подтверждения устарела или неверна.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Вернуться ко входу</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
