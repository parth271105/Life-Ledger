"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { attemptsSince, clientIp, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { safeTz } from "@/lib/dates";

type State = { error?: string; email?: string } | undefined;

export async function login(_: State, fd: FormData): Promise<State> {
  const email = String(fd.get("email") ?? "").slice(0, 200);
  try {
    await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      tz: fd.get("tz"),
      redirectTo: "/",
    });
  } catch (e) {
    unstable_rethrow(e); // successful sign-in redirects by throwing
    if (e instanceof AuthError && e.type === "CredentialsSignin") {
      return (e as { code?: string }).code === "rate_limited"
        ? { error: "Too many tries. Please wait 15 minutes and try again.", email }
        : { error: "That email and password don't match.", email };
    }
    console.error(e);
    return { error: "We couldn't sign you in just now. Please try again in a moment.", email };
  }
}

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  password: z.string().min(8, "Use at least 8 characters for your password").max(200, "That password is too long"),
});

export async function signup(prev: State, fd: FormData): Promise<State> {
  const p = signupSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    const key = "su:" + clientIp(await headers());
    if ((await attemptsSince(key)) >= 10) return { error: "Too many sign-ups from here. Please try again later." };
    if (await db.user.findUnique({ where: { email: p.data.email } }))
      return { error: "That email already has an account. Try logging in." };
    await db.user.create({
      data: { email: p.data.email, passwordHash: await bcrypt.hash(p.data.password, 10), tz: safeTz(fd.get("tz")) },
    });
    await db.loginAttempt.create({ data: { key } });
  } catch (e) {
    console.error(e);
    return { error: "We couldn't create your account just now. Please try again in a moment." };
  }
  fd.set("email", p.data.email);
  return login(prev, fd);
}
