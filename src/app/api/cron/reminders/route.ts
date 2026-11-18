import { db } from "@/lib/db";
import { addDays, toYmd, todayIn } from "@/lib/dates";
import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

// Runs once a day (vercel.json). Sends "due tomorrow" and "due today" reminders, each once per task.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const now = Date.now();
  const tasks = await db.task.findMany({
    where: {
      doneAt: null,
      deadline: { gte: new Date(now - 2 * 864e5), lte: new Date(now + 3 * 864e5) },
      OR: [{ remindedBefore: false }, { remindedOnDay: false }],
    },
    include: { user: { select: { tz: true, pushSubs: true } } },
  });

  type Bucket = { subs: (typeof tasks)[number]["user"]["pushSubs"]; today: string[]; tomorrow: string[]; ids: { before: string[]; day: string[] } };
  const users = new Map<string, Bucket>();
  for (const t of tasks) {
    const today = todayIn(t.user.tz);
    const d = toYmd(t.deadline);
    const u = users.get(t.userId) ?? { subs: t.user.pushSubs, today: [], tomorrow: [], ids: { before: [], day: [] } };
    if (d === today && !t.remindedOnDay) (u.today.push(t.title), u.ids.day.push(t.id));
    else if (d === addDays(today, 1) && !t.remindedBefore) (u.tomorrow.push(t.title), u.ids.before.push(t.id));
    users.set(t.userId, u);
  }

  const text = (titles: string[], when: string) =>
    titles.length === 1 ? { title: `Due ${when}: ${titles[0]}`, body: "Open Life Ledger to mark it done." } : { title: `${titles.length} tasks due ${when}`, body: titles.join(" · ") };

  let sent = 0;
  for (const u of users.values()) {
    if (u.today.length) sent += await sendPush(u.subs, { ...text(u.today, "today"), url: "/tasks" });
    if (u.tomorrow.length) sent += await sendPush(u.subs, { ...text(u.tomorrow, "tomorrow"), url: "/tasks" });
    await Promise.all([
      u.ids.day.length && db.task.updateMany({ where: { id: { in: u.ids.day } }, data: { remindedOnDay: true, remindedBefore: true } }),
      u.ids.before.length && db.task.updateMany({ where: { id: { in: u.ids.before } }, data: { remindedBefore: true } }),
    ]);
  }
  return Response.json({ ok: true, users: users.size, sent });
}
