"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { requireUser, signOut } from "@/lib/auth";
import { form, run } from "@/lib/action";
import { YMD, nextMonth, toDate } from "@/lib/dates";
import { money } from "@/lib/format";

const ymd = z.string().regex(YMD, "Pick a date");
const id = z.string().min(1).max(40);

/* ---------- Goals ---------- */

const goalSchema = z.object({
  name: z.string().trim().min(1, "Give the goal a name").max(40, "Keep the name under 40 characters"),
  target: z.coerce.number().positive("Target must be more than 0").max(100000, "That target is too big"),
  unit: z.string().trim().max(15, "Keep the unit short").default(""),
});

export async function saveGoal(fd: FormData) {
  const me = await requireUser();
  return run(async () => {
    const data = goalSchema.parse(form(fd));
    const goalId = fd.get("id");
    if (goalId) await db.goal.updateMany({ where: { id: String(goalId), userId: me.id }, data });
    else await db.goal.create({ data: { ...data, userId: me.id } });
  });
}

export async function deleteGoal(goalId: string) {
  const me = await requireUser();
  return run(async () => {
    await db.goal.deleteMany({ where: { id: id.parse(goalId), userId: me.id } });
  });
}

/** Sets the absolute value for a goal on a day (idempotent, safe to tap fast). */
export async function logGoal(goalId: string, date: string, value: number) {
  const me = await requireUser();
  return run(async () => {
    const gid = id.parse(goalId);
    const day = toDate(ymd.parse(date));
    const v = z.number().min(0).max(100000).parse(Math.round(value * 100) / 100);
    if (!(await db.goal.count({ where: { id: gid, userId: me.id } }))) throw new z.ZodError([]);
    if (v === 0) await db.goalLog.deleteMany({ where: { goalId: gid, date: day } });
    else
      await db.goalLog.upsert({
        where: { goalId_date: { goalId: gid, date: day } },
        create: { goalId: gid, date: day, value: v },
        update: { value: v },
      });
  }, false);
}

/* ---------- Weight ---------- */

const weightSchema = z.object({
  kg: z.coerce.number().min(20, "Enter your weight in kg").max(400, "Enter your weight in kg"),
  date: ymd,
});

export async function logWeight(fd: FormData) {
  const me = await requireUser();
  return run(async () => {
    const { kg, date } = weightSchema.parse(form(fd));
    const d = toDate(date);
    await db.weightLog.upsert({
      where: { userId_date: { userId: me.id, date: d } },
      create: { userId: me.id, date: d, kg },
      update: { kg },
    });
  });
}

export async function deleteWeight(wid: string) {
  const me = await requireUser();
  return run(async () => {
    await db.weightLog.deleteMany({ where: { id: id.parse(wid), userId: me.id } });
  });
}

/* ---------- Tasks ---------- */

const taskSchema = z.object({
  title: z.string().trim().min(1, "What's the task?").max(120, "Keep the task under 120 characters"),
  notes: z.string().trim().max(1000, "Notes are too long").default(""),
  deadline: ymd,
});

export async function saveTask(fd: FormData) {
  const me = await requireUser();
  return run(async () => {
    const t = taskSchema.parse(form(fd));
    const data = { ...t, deadline: toDate(t.deadline) };
    const taskId = fd.get("id");
    if (taskId) {
      const old = await db.task.findFirst({ where: { id: String(taskId), userId: me.id } });
      if (!old) return;
      const moved = old.deadline.getTime() !== data.deadline.getTime();
      await db.task.updateMany({
        where: { id: old.id, userId: me.id },
        data: moved ? { ...data, remindedBefore: false, remindedOnDay: false } : data,
      });
    } else await db.task.create({ data: { ...data, userId: me.id } });
  });
}

export async function toggleTask(taskId: string, done: boolean) {
  const me = await requireUser();
  return run(async () => {
    await db.task.updateMany({ where: { id: id.parse(taskId), userId: me.id }, data: { doneAt: done ? new Date() : null } });
  });
}

export async function deleteTask(taskId: string) {
  const me = await requireUser();
  return run(async () => {
    await db.task.deleteMany({ where: { id: id.parse(taskId), userId: me.id } });
  });
}

/* ---------- Money ---------- */

// "food " / "Food" -> "Food" so budgets and charts group the same category.
const category = z
  .string()
  .trim()
  .min(1, "Pick a category")
  .max(30, "Keep the category short")
  .transform((s) => s.replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase()));

const amount = z.coerce.number().positive("Enter an amount above 0").max(999999999, "That amount is too big");

const txSchema = z.object({
  amount,
  type: z.enum(["IN", "OUT"]),
  category,
  date: ymd,
  note: z.string().trim().max(200, "Keep the note short").default(""),
});

async function budgetNotice(userId: string, cat: string, date: string) {
  const b = await db.budget.findUnique({ where: { userId_category: { userId, category: cat } } });
  if (!b) return;
  const ym = date.slice(0, 7);
  const s = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { userId, category: cat, type: "OUT", date: { gte: toDate(ym + "-01"), lt: toDate(nextMonth(ym) + "-01") } },
  });
  const spent = Number(s._sum.amount ?? 0);
  const limit = Number(b.monthlyLimit);
  if (spent > limit) return `Over your ${cat} budget by ${money(spent - limit)} this month`;
  if (spent >= 0.8 * limit) return `Heads up: ${Math.round((spent / limit) * 100)}% of your ${cat} budget used`;
}

export async function saveTx(fd: FormData) {
  const me = await requireUser();
  return run(async () => {
    const t = txSchema.parse(form(fd));
    const data = { ...t, date: toDate(t.date) };
    const txId = fd.get("id");
    if (txId) await db.transaction.updateMany({ where: { id: String(txId), userId: me.id }, data });
    else await db.transaction.create({ data: { ...data, userId: me.id } });
    if (t.type === "OUT") return budgetNotice(me.id, t.category, t.date);
  });
}

export async function deleteTx(txId: string) {
  const me = await requireUser();
  return run(async () => {
    await db.transaction.deleteMany({ where: { id: id.parse(txId), userId: me.id } });
  });
}

const budgetSchema = z.object({ category, monthlyLimit: amount });

export async function saveBudget(fd: FormData) {
  const me = await requireUser();
  return run(async () => {
    const { category: cat, monthlyLimit } = budgetSchema.parse(form(fd));
    const old = fd.get("id");
    if (old) await db.budget.deleteMany({ where: { id: String(old), userId: me.id, NOT: { category: cat } } });
    await db.budget.upsert({
      where: { userId_category: { userId: me.id, category: cat } },
      create: { userId: me.id, category: cat, monthlyLimit },
      update: { monthlyLimit },
    });
  });
}

export async function deleteBudget(bid: string) {
  const me = await requireUser();
  return run(async () => {
    await db.budget.deleteMany({ where: { id: id.parse(bid), userId: me.id } });
  });
}

/* ---------- Push + account ---------- */

const subSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(200) }),
});

export async function savePush(sub: unknown) {
  const me = await requireUser();
  return run(async () => {
    const { endpoint, keys } = subSchema.parse(sub);
    await db.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, ...keys, userId: me.id },
      update: { ...keys, userId: me.id },
    });
  }, false);
}

export async function removePush(endpoint: string) {
  const me = await requireUser();
  return run(async () => {
    await db.pushSubscription.deleteMany({ where: { endpoint: String(endpoint), userId: me.id } });
  }, false);
}

export async function testPush() {
  const me = await requireUser();
  return run(async () => {
    const subs = await db.pushSubscription.findMany({ where: { userId: me.id } });
    const sent = await sendPush(subs, { title: "Life Ledger", body: "Reminders are working.", url: "/tasks" });
    return sent ? "Test notification sent" : "No device is set up for reminders yet";
  }, false);
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
