import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { YMD, addDays, bestStreak, currentStreak, nextMonth, range, toDate, toYmd, todayIn, weekStart, ymdIn } from "@/lib/dates";
import { fmtDay } from "@/lib/format";
import { PageHead } from "@/components/ui";
import { Charts } from "./charts";

export const metadata = { title: "Stats · Life Ledger" };

type SP = { r?: string; from?: string; to?: string };

export default async function Stats({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireUser();
  const today = todayIn(me.tz);
  const sp = await searchParams;
  const r = sp.r === "month" || sp.r === "custom" ? sp.r : "week";

  let from = addDays(today, r === "month" ? -29 : -6);
  let to = today;
  if (r === "custom" && sp.from && sp.to && YMD.test(sp.from) && YMD.test(sp.to)) {
    [from, to] = sp.from <= sp.to ? [sp.from, sp.to] : [sp.to, sp.from];
    if (range(from, to).length > 366) from = addDays(to, -365);
  }

  const days = range(from, to);
  const weekly = days.length > 31;
  const bucketOf = (d: string) => (weekly ? weekStart(d) : d);
  const buckets = [...new Set(days.map(bucketOf))];
  const label = (b: string) =>
    weekly ? fmtDay(b, { day: "numeric", month: "short" }) : days.length <= 7 ? fmtDay(b, { weekday: "short" }) : fmtDay(b, { day: "numeric", month: "short" });
  const between = { gte: toDate(from), lte: toDate(to) };
  const budgetMonth = to.slice(0, 7);

  const [goals, weights, tasks, txs, budgets, monthOut] = await Promise.all([
    db.goal.findMany({ where: { userId: me.id }, orderBy: { createdAt: "asc" }, include: { logs: { where: { date: { lte: toDate(to) } } } } }),
    db.weightLog.findMany({ where: { userId: me.id, date: between }, orderBy: { date: "asc" } }),
    db.task.findMany({ where: { userId: me.id, deadline: between }, select: { deadline: true, doneAt: true } }),
    db.transaction.findMany({ where: { userId: me.id, date: between }, select: { date: true, type: true, amount: true, category: true } }),
    db.budget.findMany({ where: { userId: me.id }, orderBy: { category: "asc" } }),
    db.transaction.groupBy({
      by: ["category"],
      where: { userId: me.id, type: "OUT", date: { gte: toDate(budgetMonth + "-01"), lt: toDate(nextMonth(budgetMonth) + "-01") } },
      _sum: { amount: true },
    }),
  ]);

  /* Goals: daily completion %, per-goal values, streaks */
  const goalData = goals.map((g) => {
    const byDay = new Map(g.logs.map((l) => [toYmd(l.date), l.value]));
    const met = new Set([...byDay].filter(([, v]) => v >= g.target).map(([d]) => d));
    const start = ymdIn(g.createdAt, me.tz);
    const activeDays = days.filter((d) => d >= start);
    return {
      id: g.id,
      name: g.name,
      start,
      met,
      current: currentStreak(met, today),
      best: bestStreak(met),
      rate: activeDays.length ? Math.round((activeDays.filter((d) => met.has(d)).length / activeDays.length) * 100) : null,
    };
  });

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const inBucket = (b: string) => days.filter((d) => bucketOf(d) === b);

  const completion = buckets.map((b) => {
    const pcts = inBucket(b)
      .map((d) => {
        const active = goalData.filter((g) => g.start <= d);
        return active.length ? (active.filter((g) => g.met.has(d)).length / active.length) * 100 : null;
      })
      .filter((x): x is number => x !== null);
    const a = avg(pcts);
    return { label: label(b), pct: a === null ? null : Math.round(a) };
  });

  // Per goal: share of days ticked in each bucket (a day is 0% or 100%; a week is the average).
  const goalSeries = goalData.map((g) => ({
    id: g.id,
    name: g.name,
    points: buckets.map((b) => {
      const a = avg(inBucket(b).filter((d) => d >= g.start).map((d) => (g.met.has(d) ? 100 : 0)));
      return { label: label(b), value: a === null ? 0 : Math.round(a) };
    }),
  }));

  /* Tasks: done vs missed by deadline (future, not-done tasks are neither) */
  const taskBars = buckets.map((b) => ({ label: label(b), done: 0, missed: 0 }));
  for (const t of tasks) {
    const d = toYmd(t.deadline);
    const row = taskBars[buckets.indexOf(bucketOf(d))];
    if (!row) continue;
    if (t.doneAt) row.done++;
    else if (d < today) row.missed++;
  }

  /* Money */
  const cash = buckets.map((b) => ({ label: label(b), income: 0, expense: 0 }));
  const byCat = new Map<string, number>();
  for (const t of txs) {
    const row = cash[buckets.indexOf(bucketOf(toYmd(t.date)))];
    const n = Number(t.amount);
    if (t.type === "IN") row.income += n;
    else {
      row.expense += n;
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + n);
    }
  }
  const spending = [...byCat].map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount);
  const outBy = new Map(monthOut.map((m) => [m.category, Number(m._sum.amount ?? 0)]));
  const budgetUse = budgets.map((b) => {
    const spent = outBy.get(b.category) ?? 0;
    const limit = Number(b.monthlyLimit);
    return { category: b.category, spent, limit, pct: Math.round((spent / limit) * 100) };
  });

  const chip = (key: string, text: string) => (
    <Link
      href={key === "week" ? "/stats" : `/stats?r=${key}`}
      aria-current={r === key ? "page" : undefined}
      className={`grid min-h-11 place-items-center rounded-xl text-[15px] font-semibold ${r === key ? "bg-white text-ink shadow-sm" : "text-muted"}`}
    >
      {text}
    </Link>
  );

  return (
    <>
      <PageHead title="Stats" sub={`${fmtDay(from, { day: "numeric", month: "short" })} – ${fmtDay(to, { day: "numeric", month: "short", year: "numeric" })}`} />
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-paper p-1">
        {chip("week", "Week")}
        {chip("month", "Month")}
        {chip("custom", "Custom")}
      </div>
      {r === "custom" && (
        <form className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2" action="/stats">
          <input type="hidden" name="r" value="custom" />
          <label className="min-w-0">
            <span className="label">From</span>
            <input className="input px-2" type="date" name="from" defaultValue={from} max={today} required />
          </label>
          <label className="min-w-0">
            <span className="label">To</span>
            <input className="input px-2" type="date" name="to" defaultValue={to} required />
          </label>
          <button className="btn btn-primary px-4">Go</button>
        </form>
      )}

      <Charts
        weekly={weekly}
        completion={completion}
        streaks={goalData.map((g) => ({ name: g.name, current: g.current, best: g.best, rate: g.rate }))}
        goalSeries={goalSeries}
        weights={weights.map((w) => ({ label: fmtDay(toYmd(w.date), { day: "numeric", month: "short" }), kg: w.kg }))}
        taskBars={taskBars}
        cash={cash.map((c) => ({ ...c, income: Math.round(c.income * 100) / 100, expense: Math.round(c.expense * 100) / 100 }))}
        spending={spending}
        budgetMonth={toDate(budgetMonth + "-01").toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })}
        budgetUse={budgetUse}
      />
    </>
  );
}
