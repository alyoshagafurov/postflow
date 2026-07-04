import type { Metadata } from "next";
import {
  VerifyEmailForm,
  VerifyEmailInvalid,
} from "@/components/auth/verify-email-form";

export const metadata: Metadata = { title: "Подтверждение email" };

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  if (!token || token.length < 10) {
    return <VerifyEmailInvalid />;
  }
  return <VerifyEmailForm token={token} />;
}
