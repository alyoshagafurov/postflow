import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { env, features } from "@/lib/env";
import { ensureUserSubscription } from "@/lib/billing/subscription";
import { writeAudit } from "@/lib/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [];

if (features.google) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Link Google to an existing email/password account (email is verified by Google).
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "")
        .toLowerCase()
        .trim();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) return null;

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      };
    },
  }),
);

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
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: Role }).role ?? Role.USER;
      }
      // Backfill role/id for tokens created before role was present (e.g. OAuth).
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
      // OAuth sign-ups are created by the adapter — give them a Free plan.
      try {
        await ensureUserSubscription(user.id);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[auth] ensureUserSubscription failed", err);
      }
    },
    async signIn({ user }) {
      await writeAudit({ userId: user.id, action: "auth.signin" });
    },
  },
};
