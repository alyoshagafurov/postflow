import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export function getSession() {
  return getServerSession(authOptions);
}

/** Full user record for the current session, or null. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

/** Lightweight session user; redirects to /login when unauthenticated. */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

/** Requires ADMIN role; redirects otherwise. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }
  return session.user;
}
