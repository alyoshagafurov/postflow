"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-.97 2.6-2.06 3.4v2.8h3.34C20.7 18.5 21.7 15.6 21.7 12.2c0-.7-.06-1.4-.18-2H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.4l-3.34-2.6c-.93.6-2.12.98-3.28.98-2.52 0-4.66-1.7-5.42-4H3.14v2.9C4.78 19.98 8.15 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.58 13.98c-.2-.6-.31-1.24-.31-1.9s.11-1.3.31-1.9V7.28H3.14A9.98 9.98 0 0 0 2 12.08c0 1.6.38 3.1 1.14 4.4l3.44-2.5z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.18c1.47 0 2.78.5 3.82 1.5l2.85-2.85C16.97 3.2 14.7 2.2 12 2.2 8.15 2.2 4.78 4.22 3.14 7.28l3.44 2.9C7.34 7.88 9.48 6.18 12 6.18z"
      />
    </svg>
  );
}

export function GoogleButton({
  callbackUrl = "/dashboard",
  label = "Продолжить с Google",
}: {
  callbackUrl?: string;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      onClick={() => signIn("google", { callbackUrl })}
    >
      <GoogleIcon />
      {label}
    </Button>
  );
}
