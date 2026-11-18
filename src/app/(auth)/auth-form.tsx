"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { login, signup } from "./actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  const [tz, setTz] = useState("UTC");
  const [email, setEmail] = useState(""); // controlled so a failed attempt doesn't wipe it
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const isLogin = mode === "login";

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="tz" value={tz} />
      <label className="block">
        <span className="label">Email</span>
        <input className="input" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input
          className="input"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={isLogin ? undefined : 8}
          required
        />
        {!isLogin && <span className="mt-1.5 block text-[13px] text-muted">At least 8 characters.</span>}
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-berry-soft px-3 py-2 text-[15px] text-berry">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary mt-1 w-full" disabled={pending}>
        {pending ? "One moment…" : isLogin ? "Log in" : "Create account"}
      </button>
      <p className="text-center text-[15px] text-muted">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link className="font-semibold text-clay-dark underline underline-offset-4" href={isLogin ? "/signup" : "/login"}>
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
