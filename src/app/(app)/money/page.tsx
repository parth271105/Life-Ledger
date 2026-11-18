import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextMonth, toDate, toYmd, todayIn } from "@/lib/dates";
import { money } from "@/lib/format";
import { PageHead } from "@/components/ui";
import { MoneyView } from "./money-view";

export const metadata = { title: "Money · Life Ledger" };

const DEFAULT_CATS = ["Food", "Groceries", "Transport", "Bills", "Rent", "Shopping", "Health", "Fun", "Salary", "Other"];

const prevMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

export default async function Money({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const me = await requireUser();
  const today = todayIn(me.tz);
  const thisMonth = today.slice(0, 7);
  const { m: qm } = await searchParams;
  const month = qm && /^\d{4}-(0[1-9]|1[0-2])$/.test(qm) && qm <= thisMonth ? qm : thisMonth;
  const between = { gte: toDate(month + "-01"), lt: toDate(nextMonth(month) + "-01") };

  const [sums, txs, budgets, cats] = await Promise.all([
    db.transaction.groupBy({ by: ["type"], where: { userId: me.id }, _sum: { amount: true } }),
    db.transaction.findMany({ where: { userId: me.id, date: between }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    db.budget.findMany({ where: { userId: me.id }, orderBy: { category: "asc" } }),
    db.transaction.findMany({ where: { userId: me.id }, distinct: ["category"], select: { category: true }, take: 50 }),
  ]);

  const total = (t: "IN" | "OUT") => Number(sums.find((s) => s.type === t)?._sum.amount ?? 0);
  const rows = txs.map((t) => ({ id: t.id, amount: Number(t.amount), type: t.type, category: t.category, date: toYmd(t.date), note: t.note }));
  const spentBy = new Map<string, number>();
  for (const t of rows) if (t.type === "OUT") spentBy.set(t.category, (spentBy.get(t.category) ?? 0) + t.amount);
  const monthIn = rows.filter((t) => t.type === "IN").reduce((s, t) => s + t.amount, 0);
  const monthOut = rows.filter((t) => t.type === "OUT").reduce((s, t) => s + t.amount, 0);

  const monthName = (ym: string) => toDate(ym + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const balance = total("IN") - total("OUT");

  return (
    <>
      <PageHead title="Money" />
      <section className="card">
        <p className="text-[14px] font-medium text-muted">Balance</p>
        <p className={`tabular text-[34px] leading-tight font-semibold ${balance < 0 ? "text-berry" : ""}`}>{money(balance)}</p>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <Link href={`/money?m=${prevMonth(month)}`} className="grid size-11 place-items-center rounded-full text-xl text-muted" aria-label="Previous month">
          ‹
        </Link>
        <h2 className="text-[18px] font-semibold">{monthName(month)}</h2>
        {month < thisMonth ? (
          <Link href={nextMonth(month) === thisMonth ? "/money" : `/money?m=${nextMonth(month)}`} className="grid size-11 place-items-center rounded-full text-xl text-muted" aria-label="Next month">
            ›
          </Link>
        ) : (
          <span className="size-11" />
        )}
      </div>

      <MoneyView
        today={today}
        monthIn={monthIn}
        monthOut={monthOut}
        txs={rows}
        budgets={budgets.map((b) => ({ id: b.id, category: b.category, limit: Number(b.monthlyLimit), spent: spentBy.get(b.category) ?? 0 }))}
        categories={[...new Set([...cats.map((c) => c.category), ...DEFAULT_CATS])]}
      />
    </>
  );
}
