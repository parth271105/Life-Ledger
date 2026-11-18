import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "./db";
import { safeTz } from "./dates";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

const creds = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
  tz: z.string().max(64).optional(),
});

const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { email: 5, ip: 20 };

export const clientIp = (h: Headers) => h.get("x-forwarded-for")?.split(",")[0].trim() || "local";

export async function attemptsSince(key: string) {
  return db.loginAttempt.count({ where: { key, createdAt: { gte: new Date(Date.now() - WINDOW_MS) } } });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, tz: {} },
      async authorize(raw, request) {
        const p = creds.safeParse(raw);
        if (!p.success) return null;
        const { email, password } = p.data;
        const eKey = "e:" + email;
        const ipKey = "ip:" + clientIp(request.headers);

        const [byEmail, byIp] = await Promise.all([attemptsSince(eKey), attemptsSince(ipKey)]);
        if (byEmail >= LIMITS.email || byIp >= LIMITS.ip) throw new RateLimited();

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
          await db.loginAttempt.createMany({ data: [{ key: eKey }, { key: ipKey }] });
          return null;
        }

        const tz = safeTz(p.data.tz);
        await Promise.all([
          tz !== user.tz ? db.user.update({ where: { id: user.id }, data: { tz } }) : null,
          db.loginAttempt.deleteMany({
            where: { OR: [{ key: eKey }, { createdAt: { lt: new Date(Date.now() - 864e5) } }] },
          }),
        ]);
        return { id: user.id, email: user.email, tz } as { id: string; email: string };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.tz = (user as { tz?: string }).tz;
      }
      return token;
    },
    session({ session, token }) {
      Object.assign(session, { uid: token.uid, tz: token.tz });
      return session;
    },
  },
});

type Me = { id: string; tz: string; email: string };

export async function currentUser(): Promise<Me | null> {
  const s = (await auth()) as { uid?: string; tz?: string; user?: { email?: string } } | null;
  return s?.uid ? { id: s.uid, tz: safeTz(s.tz), email: s.user?.email ?? "" } : null;
}

export async function requireUser(): Promise<Me> {
  const me = await currentUser();
  if (!me) redirect("/login");
  return me;
}
