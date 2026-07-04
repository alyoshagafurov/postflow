import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { features } from "@/lib/env";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Регистрация" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session?.user) {
    redirect("/dashboard");
  }
  return <RegisterForm googleEnabled={features.google} />;
}
