import { Platform } from "@prisma/client";
import { cn } from "@/lib/utils";

export function PlatformIcon({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  const cls = cn("h-5 w-5", className);
  switch (platform) {
    case "YOUTUBE":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M23.5 6.2a3 3 0 0 0-2.11-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.39.52A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.11 2.13c1.89.52 9.39.52 9.39.52s7.5 0 9.39-.52A3 3 0 0 0 23.5 17.8 31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
        </svg>
      );
    case "TIKTOK":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
          <path d="M16.6 5.82a4.28 4.28 0 0 1-1.05-2.82h-3.09v12.27a2.4 2.4 0 1 1-2.4-2.4c.24 0 .48.04.7.11V9.83a5.6 5.6 0 0 0-.7-.05 5.5 5.5 0 1 0 5.5 5.5V9.32a7.3 7.3 0 0 0 4.29 1.38V7.6a4.28 4.28 0 0 1-3.25-1.78z" />
        </svg>
      );
    case "INSTAGRAM":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className={cls}
          aria-hidden
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}
