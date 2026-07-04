"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function BillingToaster() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const checkout = sp.get("checkout");
    if (checkout === "success") {
      toast.success("Подписка оформлена!");
      done.current = true;
      router.replace(pathname);
    } else if (checkout === "cancel") {
      toast("Оплата отменена");
      done.current = true;
      router.replace(pathname);
    }
  }, [sp, router, pathname]);

  return null;
}
