import type { Metadata } from "next";
import {
  ResetPasswordForm,
  ResetPasswordInvalid,
} from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Новый пароль" };

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  if (!token || token.length < 10) {
    return <ResetPasswordInvalid />;
  }
  return <ResetPasswordForm token={token} />;
}
