"use client";

import { useState } from "react";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bar } from "@/components/ui";
import { money, num } from "@/lib/format";

// Validated pair (CVD-safe): blue for in/done, clay for out/missed. Single-series charts use clay.
const BLUE = "#2a7bb8";
const CLAY = "#c2553b";
const GRID = "#ece5da";
const TICK = { fontSize: 12, fill: "#7a6e64" };
const TIP = {
  contentStyle: { borderRadius: 12, border: "1px solid #e8dfd2", background: "#fffcf7", fontSize: 14 },
  cursor: { fill: "rgba(43,36,32,0.05)" },
};

type Props = {
  weekly: boolean;
  completion: { label: string; pct: number | null }[];
  streaks: { name: string; current: number; best: number; rate: number | null }[];
  goalSeries: { id: string; name: string; unit: string; target: number; points: { label: string; value: number }[] }[];
  weights: { label: string; kg: number }[];
  taskBars: { label: string; done: number; missed: number }[];
  cash: { label: string; income: number; expense: number }[];
  spending: { category: string; amount: number }[];
  budgetMonth: string;
  budgetUse: { category: string; spent: number; limit: number; pct: number }[];
};

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card mt-4">
      <h2 className="text-[18px] font-semibold">{title}</h2>
      {sub && <p className="text-[13px] text-muted">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const Empty = ({ text }: { text: string }) => <p className="py-6 text-center text-[15px] text-muted">{text}</p>;

// Called as a function (not <Axes/>) because Recharts only sees its direct children.
const axes = (unit = "", domain?: [number, number]) => [
  <CartesianGrid key="g" vertical={false} stroke={GRID} />,
  <XAxis key="x" dataKey="label" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />,
  <YAxis key="y" tick={TICK} tickLine={false} axisLine={false} width={44} allowDecimals={false} unit={unit} domain={domain} />,
];

export function Charts(p: Props) {
  const [goalId, setGoalId] = useState(p.goalSeries[0]?.id ?? "");
  const goal = p.goalSeries.find((g) => g.id === goalId) ?? p.goalSeries[0];
  const per = p.weekly ? "per week" : "per day";
  const hasTasks = p.taskBars.some((t) => t.done || t.missed);
  const hasCash = p.cash.some((c) => c.income || c.expense);
  const spending = p.spending.length > 8
    ? [...p.spending.slice(0, 7), { category: "Other", amount: p.spending.slice(7).reduce((s, x) => s + x.amount, 0) }]
    : p.spending;

  return (
    <>
      <Card title="Goals completed" sub={`Share of daily goals hit, ${p.weekly ? "weekly average" : "each day"}`}>
        {p.streaks.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={p.completion} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              {axes("%", [0, 100])}
              <Tooltip {...TIP} formatter={(v) => [`${v}%`, "Completed"]} />
              <Line type="monotone" dataKey="pct" stroke={CLAY} strokeWidth={2} dot={{ r: 4, fill: CLAY, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="Add a daily goal on Today to see this." />
        )}
      </Card>

      {p.streaks.length > 0 && (
        <Card title="Streaks">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[13px] text-muted">
                <th className="pb-2 font-semibold">Goal</th>
                <th className="pb-2 text-right font-semibold">Now</th>
                <th className="pb-2 text-right font-semibold">Best</th>
                <th className="pb-2 text-right font-semibold">Hit</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {p.streaks.map((s) => (
                <tr key={s.name} className="border-t border-line">
                  <td className="max-w-0 truncate py-2.5 pr-2 font-medium">{s.name}</td>
                  <td className="py-2.5 text-right">{s.current > 0 ? `🔥 ${s.current}` : "0"}</td>
                  <td className="py-2.5 text-right">{s.best}</td>
                  <td className="py-2.5 text-right">{s.rate === null ? "—" : `${s.rate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {goal && (
        <Card title="Goal progress" sub={p.weekly ? "Average per day, each week" : "Logged each day"}>
          <select className="input mb-3" value={goal.id} onChange={(e) => setGoalId(e.target.value)} aria-label="Goal">
            {p.goalSeries.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={goal.points} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
              {axes()}
              <Tooltip {...TIP} formatter={(v) => [`${num(Number(v))} ${goal.unit}`, goal.name]} />
              <ReferenceLine y={goal.target} stroke="#2b2420" strokeDasharray="4 4" label={{ value: "target", position: "insideTopRight", fontSize: 12, fill: "#7a6e64" }} />
              <RBar dataKey="value" fill={CLAY} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {p.weights.length > 0 && (
        <Card title="Weight" sub="kg">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={p.weights} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} width={44} domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip {...TIP} formatter={(v) => [`${num(Number(v))} kg`, "Weight"]} />
              <Line type="monotone" dataKey="kg" stroke={CLAY} strokeWidth={2} dot={{ r: 4, fill: CLAY, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title="Tasks done vs missed" sub={`By deadline, ${per}`}>
        {hasTasks ? (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={p.taskBars} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              {axes()}
              <Tooltip {...TIP} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
              <RBar dataKey="done" name="Done" stackId="t" fill={BLUE} maxBarSize={28} stroke="#fffcf7" strokeWidth={1} />
              <RBar dataKey="missed" name="Missed" stackId="t" fill={CLAY} radius={[4, 4, 0, 0]} maxBarSize={28} stroke="#fffcf7" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="No tasks with deadlines in this period." />
        )}
      </Card>

      <Card title="Income vs expense" sub={per}>
        {hasCash ? (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={p.cash} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
              <YAxis tick={TICK} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip {...TIP} formatter={(v, n) => [money(Number(v)), n]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
              <RBar dataKey="income" name="Income" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <RBar dataKey="expense" name="Expense" fill={CLAY} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="No money entries in this period." />
        )}
      </Card>

      <Card title="Spending by category">
        {spending.length ? (
          <ResponsiveContainer width="100%" height={Math.max(120, spending.length * 40)}>
            <BarChart data={spending} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="category" tick={{ ...TICK, fill: "#2b2420" }} tickLine={false} axisLine={false} width={96} />
              <Tooltip {...TIP} formatter={(v) => [money(Number(v)), "Spent"]} />
              <RBar dataKey="amount" fill={CLAY} radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="No spending in this period." />
        )}
      </Card>

      <Card title="Budget usage" sub={p.budgetMonth}>
        {p.budgetUse.length ? (
          <ul className="grid gap-4">
            {p.budgetUse.map((b) => (
              <li key={b.category}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[15px]">
                  <span className="truncate font-semibold">{b.category}</span>
                  <span className={`tabular shrink-0 font-semibold ${b.pct > 100 ? "text-berry" : b.pct >= 80 ? "text-honey" : "text-muted"}`}>
                    {b.pct}%{b.pct > 100 ? " · over" : b.pct >= 80 ? " · close" : ""}
                  </span>
                </div>
                <Bar pct={b.pct / 100} tone={b.pct > 100 ? "berry" : b.pct >= 80 ? "honey" : "sage"} />
                <p className="tabular mt-1 text-[13px] text-muted">
                  {money(b.spent)} of {money(b.limit)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Set budgets on the Money tab to track them here." />
        )}
      </Card>
    </>
  );
}
