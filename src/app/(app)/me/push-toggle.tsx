"use client";

import { useEffect, useState } from "react";
import { removePush, savePush, testPush } from "@/app/actions";
import { callAction, toast } from "@/components/ui";

type State = "loading" | "unsupported" | "ios" | "denied" | "off" | "on" | "busy";

const keyBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
        return setState(ios && !standalone ? "ios" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      setState((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setState("busy");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      if (await callAction(() => savePush(sub.toJSON()))) {
        setState("on");
        toast("Reminders are on");
      } else setState("off");
    } catch {
      toast("Couldn't turn on reminders on this device.", "error");
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await callAction(() => removePush(sub.endpoint));
        await sub.unsubscribe();
      }
    } finally {
      setState("off");
    }
  }

  const note = (t: string) => <p className="mt-3 rounded-xl bg-paper px-3 py-2.5 text-[14px]">{t}</p>;

  if (state === "loading") return <div className="mt-3 h-12 animate-pulse rounded-xl bg-paper" />;
  if (state === "ios") return note("On iPhone: tap Share, then “Add to Home Screen”. Open Life Ledger from your Home Screen and turn reminders on here.");
  if (state === "unsupported") return note("This browser can't show reminders. Try Chrome, Edge or Safari, or install the app to your home screen.");
  if (state === "denied") return note("Notifications are blocked for Life Ledger. Allow them in your browser or phone settings, then come back.");

  return state === "on" ? (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <button className="btn btn-ghost" onClick={() => callAction(testPush)}>
        Send a test
      </button>
      <button className="btn btn-danger" onClick={disable}>
        Turn off
      </button>
    </div>
  ) : (
    <button className="btn btn-primary mt-3 w-full" onClick={enable} disabled={state === "busy"}>
      Turn on reminders
    </button>
  );
}
