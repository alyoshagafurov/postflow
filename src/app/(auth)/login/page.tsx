import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { features } from "@/lib/env";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const callbackUrl = searchParams.callbackUrl || "/dashboard";
  const session = await getSession();
  if (session?.user) {
    redirect(callbackUrl);
  }
  return <LoginForm googleEnabled={features.google} callbackUrl={callbackUrl} />;
}
