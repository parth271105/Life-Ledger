"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { OFFLINE } from "@/lib/format";

type Result = { error?: string; notice?: string };

/* ---------- Toast: one at a time, bottom of screen above the tab bar ---------- */

export function toast(msg: string, tone: "ok" | "warn" | "error" = "ok") {
  window.dispatchEvent(new CustomEvent("ll-toast", { detail: { msg, tone } }));
}

export function Toaster() {
  const [t, setT] = useState<{ msg: string; tone: string } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setT((e as CustomEvent).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setT(null), 4000);
    };
    window.addEventListener("ll-toast", on);
    return () => window.removeEventListener("ll-toast", on);
  }, []);
  if (!t) return null;
  const tone =
    t.tone === "error" ? "bg-berry text-white" : t.tone === "warn" ? "bg-honey-soft text-ink border border-honey" : "bg-ink text-white";
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}
    >
      <div className={`max-w-md rounded-2xl px-4 py-3 text-[15px] font-medium shadow-lg ${tone}`}>{t.msg}</div>
    </div>
  );
}

/** Calls a server action, shows its notice/error, and survives a dropped connection. */
export async function callAction(fn: () => Promise<Result>): Promise<boolean> {
  try {
    const r = await fn();
    if (r.error) toast(r.error, "error");
    else if (r.notice) toast(r.notice, r.notice.startsWith("Over") || r.notice.startsWith("Heads") ? "warn" : "ok");
    return !r.error;
  } catch {
    toast(OFFLINE, "error");
    return false;
  }
}

/* ---------- Sheet (native <dialog>) ---------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="px-5 pt-4" style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 place-items-center rounded-full text-2xl text-muted">
            ×
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  );
}

/* ---------- Form that posts to a server action and shows errors inline ---------- */

export function ActionForm({
  action,
  onDone,
  children,
  className = "grid gap-4",
}: {
  action: (fd: FormData) => Promise<Result>;
  onDone?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            const r = await action(fd);
            if (r.error) return setErr(r.error);
            setErr("");
            if (r.notice) toast(r.notice, r.notice.startsWith("Over") || r.notice.startsWith("Heads") ? "warn" : "ok");
            onDone?.();
          } catch {
            setErr(OFFLINE);
          }
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {err && (
        <p role="alert" className="rounded-xl bg-berry-soft px-3 py-2 text-[15px] text-berry">
          {err}
        </p>
      )}
    </form>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export function Bar({ pct, tone = "clay" }: { pct: number; tone?: "clay" | "sage" | "honey" | "berry" }) {
  const color = { clay: "bg-clay", sage: "bg-sage", honey: "bg-honey", berry: "bg-berry" }[tone];
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color} transition-[width] duration-300`} style={{ width: `${Math.min(1, Math.max(0, pct)) * 100}%` }} />
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
        {sub && <p className="mt-0.5 text-[15px] text-muted">{sub}</p>}
      </div>
      {children}
    </header>
  );
}

export function SubmitRow({ label, onDelete }: { label: string; onDelete?: () => void }) {
  return (
    <div className="mt-1 flex gap-3">
      {onDelete && (
        <button type="button" className="btn btn-danger" onClick={onDelete}>
          Delete
        </button>
      )}
      <button className="btn btn-primary flex-1">{label}</button>
    </div>
  );
}
