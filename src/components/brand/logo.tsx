import Image from "next/image";
import Link from "next/link";
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
      <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] shadow-[0_0_18px_hsl(var(--primary)/0.4)]">
        <Image
          src="/logo.png"
          alt="PostFlow"
          width={32}
          height={32}
          priority
          className="h-8 w-8 object-contain"
        />
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
