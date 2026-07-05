"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const ERRORS: Record<string, string> = {
  not_configured: "Интеграция ещё не настроена",
  denied: "Доступ отклонён",
  invalid_state: "Ошибка проверки запроса. Попробуйте ещё раз.",
  connect_failed: "Не удалось подключить аккаунт",
};

export function AccountsToaster() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const connected = sp.get("connected");
    const error = sp.get("error");
    if (connected) {
      toast.success("Аккаунт подключён");
      done.current = true;
      router.replace(pathname);
    } else if (error) {
      const reason = sp.get("reason");
      toast.error(ERRORS[error] ?? "Что-то пошло не так", {
        description: reason || undefined,
        duration: reason ? 10000 : 4000,
      });
      done.current = true;
      router.replace(pathname);
    }
  }, [sp, router, pathname]);

  return null;
}
