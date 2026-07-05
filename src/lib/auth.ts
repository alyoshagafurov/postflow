import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { env, features } from "@/lib/env";
import { ensureUserSubscription } from "@/lib/billing/subscription";
import { writeAudit } from "@/lib/audit";

// Auth is Google-only: no passwords, no email verification (Google emails are
// already verified). First sign-in = registration.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [];

if (features.google) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

function adminEmails(): string[] {
  return env.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: resolve id + role, promote configured admins.
        token.id = user.id;
        const email = (user.email ?? "").toLowerCase();
        if (email && adminEmails().includes(email)) {
          await prisma.user
            .update({ where: { id: user.id }, data: { role: Role.ADMIN } })
            .catch(() => {});
          token.role = Role.ADMIN;
        } else {
          token.role = (user as { role?: Role }).role ?? Role.USER;
        }
      }
      if (token.id && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true },
        });
        token.role = dbUser?.role ?? Role.USER;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role ?? Role.USER;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // New Google user → Free plan + mark email verified.
      try {
        await ensureUserSubscription(user.id);
        await prisma.user
          .update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          })
          .catch(() => {});
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[auth] createUser setup failed", err);
      }
    },
    async signIn({ user }) {
      await writeAudit({ userId: user.id, action: "auth.signin" });
    },
  },
};
