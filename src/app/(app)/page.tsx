import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { YMD, addDays, streakEnding, toDate, toYmd, todayIn } from "@/lib/dates";
import { fmtDay, money } from "@/lib/format";
import { GoalList, WeightCard } from "./today";

export default async function Today({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const me = await requireUser();
  const today = todayIn(me.tz);
  const { d: qd } = await searchParams;
  const day = qd && YMD.test(qd) && qd < today ? qd : today;

  const [goals, sums, due, weights] = await Promise.all([
    db.goal.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "asc" },
      include: { logs: { where: { date: { gte: toDate(addDays(day, -400)), lte: toDate(day) } } } },
    }),
    db.transaction.groupBy({ by: ["type"], where: { userId: me.id }, _sum: { amount: true } }),
    db.task.findMany({
      where: { userId: me.id, doneAt: null, deadline: { lte: toDate(addDays(today, 2)) } },
      orderBy: { deadline: "asc" },
      take: 4,
    }),
    db.weightLog.findMany({ where: { userId: me.id }, orderBy: { date: "desc" }, take: 10 }),
  ]);

  const total = (t: "IN" | "OUT") => Number(sums.find((s) => s.type === t)?._sum.amount ?? 0);
  const balance = total("IN") - total("OUT");

  const goalRows = goals.map((g) => {
    const met = new Set(g.logs.filter((l) => l.value >= g.target).map((l) => toYmd(l.date)));
    return {
      id: g.id,
      name: g.name,
      target: g.target,
      unit: g.unit,
      value: g.logs.find((l) => toYmd(l.date) === day)?.value ?? 0,
      streakBefore: streakEnding(met, addDays(day, -1)),
    };
  });

  const dueLabel = (ymd: string) =>
    ymd < today ? "Overdue" : ymd === today ? "Today" : ymd === addDays(today, 1) ? "Tomorrow" : fmtDay(ymd, { weekday: "long" });

  const isToday = day === today;

  return (
    <>
      <header className="mb-5">
        <p className="text-[15px] font-medium text-muted">{fmtDay(today, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-[30px] leading-tight font-semibold">Today</h1>
      </header>

      <section className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <Link href="/money" className="card block">
          <p className="text-[14px] font-medium text-muted">Balance</p>
          <p className={`tabular mt-1 text-[26px] font-semibold ${balance < 0 ? "text-berry" : ""}`}>{money(balance)}</p>
        </Link>
        <Link href="/tasks" className="card block min-w-0">
          <p className="text-[14px] font-medium text-muted">Due soon</p>
          {due.length ? (
            <ul className="mt-1 grid gap-1">
              {due.slice(0, 3).map((t) => {
                const ymd = toYmd(t.deadline);
                return (
                  <li key={t.id} className="flex items-baseline justify-between gap-2 text-[15px]">
                    <span className="truncate">{t.title}</span>
                    <span className={`shrink-0 text-[13px] font-semibold ${ymd < today ? "text-berry" : ymd === today ? "text-clay-dark" : "text-muted"}`}>
                      {dueLabel(ymd)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-[15px]">Nothing due. Nice.</p>
          )}
        </Link>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[20px] font-semibold">{isToday ? "Daily goals" : fmtDay(day, { weekday: "long", day: "numeric", month: "short" })}</h2>
          <nav className="flex items-center gap-1" aria-label="Change day">
            <Link href={`/?d=${addDays(day, -1)}`} className="grid size-11 place-items-center rounded-full text-xl text-muted" aria-label="Previous day">
              ‹
            </Link>
            {isToday ? (
              <span className="grid size-11 place-items-center text-xl text-line" aria-hidden>
                ›
              </span>
            ) : (
              <Link href={addDays(day, 1) >= today ? "/" : `/?d=${addDays(day, 1)}`} className="grid size-11 place-items-center rounded-full text-xl text-muted" aria-label="Next day">
                ›
              </Link>
            )}
          </nav>
        </div>
        <GoalList goals={goalRows} date={day} showStreak={isToday} />
      </section>

      <section className="mt-7">
        <WeightCard
          today={today}
          weights={weights.map((w) => ({ id: w.id, date: toYmd(w.date), kg: w.kg }))}
        />
      </section>
    </>
  );
}
