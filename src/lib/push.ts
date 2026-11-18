import * as webpush from "web-push";
import { db } from "./db";

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Sends to every subscription; drops the ones the browser has revoked. Returns how many were delivered. */
export async function sendPush(subs: Sub[], payload: { title: string; body: string; url: string }) {
  if (!subs.length) return 0;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:life-ledger@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload)),
    ),
  );
  const gone = subs.filter((_, i) => {
    const r = results[i];
    return r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0);
  });
  if (gone.length) await db.pushSubscription.deleteMany({ where: { id: { in: gone.map((s) => s.id) } } });
  return results.filter((r) => r.status === "fulfilled").length;
}
