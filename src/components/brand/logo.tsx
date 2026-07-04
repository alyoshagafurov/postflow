import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  showText = true,
}: {
  className?: string;
  href?: string | null;
  showText?: boolean;
}) {
  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold text-foreground",
        className,
      )}
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.45)]">
        <Zap className="h-4 w-4" />
      </span>
      {showText && <span className="text-lg tracking-tight">PostFlow</span>}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {inner}
      </Link>
    );
  }
  return inner;
}
