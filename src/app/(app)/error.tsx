"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h2 className="text-xl font-semibold">Что-то пошло не так</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Произошла ошибка при загрузке раздела. Попробуйте ещё раз.
      </p>
      <Button onClick={reset}>
        <RotateCw className="mr-2 h-4 w-4" />
        Повторить
      </Button>
    </div>
  );
}
