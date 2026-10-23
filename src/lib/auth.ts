import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { parseResetToken, verifyResetToken } from "@/lib/reset-token";
import { verifyTotp } from "@/lib/totp";

// Wrong authenticator codes per user. Someone who already has the password could otherwise keep
// guessing 6-digit codes, so after 5 misses in 15 minutes no code is accepted until the window passes.
// Kept in memory, so it resets when the app restarts.
const CODE_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const codeFailures = new Map<string, number[]>();

function tooManyCodeFailures(userId: string): boolean {
  const recent = (codeFailures.get(userId) ?? []).filter((t) => t > Date.now() - CODE_FAILURE_WINDOW_MS);
  codeFailures.set(userId, recent);
  return recent.length >= 5;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Authentication code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email },
          omit: { password: false, twoFactorSecret: false },
        });
        if (!user || !(await bcrypt.compare(password, user.password))) return null;

        // The login form reads these error codes to ask for, or re-ask for, the authenticator code.
        if (user.twoFactorSecret) {
          if (!credentials?.code) throw new Error("2FA_REQUIRED");
          if (tooManyCodeFailures(user.id)) throw new Error("2FA_LOCKED");
          if (!verifyTotp(user.twoFactorSecret, credentials.code)) {
            codeFailures.set(user.id, [...(codeFailures.get(user.id) ?? []), Date.now()]);
            throw new Error("2FA_INVALID");
          }
          codeFailures.delete(user.id);
        }

        await audit({ action: "LOGIN", entity: "User", entityId: user.id, userId: user.id });
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};

export type SessionUser = { id: string; name?: string | null; email?: string | null; role: Role };

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as SessionUser | undefined) ?? null;
}

/** For pages and server actions: sends signed-out visitors to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** The user a password-reset link is for, or null if the link is malformed, expired or already used. */
export async function userForResetToken(token: unknown) {
  const parsed = parseResetToken(token);
  const secret = process.env.NEXTAUTH_SECRET;
  if (!parsed || !secret) return null;
  const user = await db.user.findUnique({ where: { id: parsed.userId }, omit: { password: false } });
  return user && verifyResetToken(secret, parsed, user.password) ? user : null;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
