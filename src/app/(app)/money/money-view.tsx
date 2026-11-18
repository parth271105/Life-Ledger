"use client";

import { useState } from "react";
import { deleteBudget, deleteTx, saveBudget, saveTx } from "@/app/actions";
import { ActionForm, Bar, Field, Sheet, SubmitRow, callAction } from "@/components/ui";
import { fmtDay, money } from "@/lib/format";

type Tx = { id: string; amount: number; type: "IN" | "OUT"; category: string; date: string; note: string };
type Budget = { id: string; category: string; limit: number; spent: number };

export function MoneyView({
  today,
  monthIn,
  monthOut,
  txs,
  budgets,
  categories,
}: {
  today: string;
  monthIn: number;
  monthOut: number;
  txs: Tx[];
  budgets: Budget[];
  categories: string[];
}) {
  const [tx, setTx] = useState<Tx | "IN" | "OUT" | null>(null);
  const [budget, setBudget] = useState<Budget | "new" | null>(null);

  const days = [...new Set(txs.map((t) => t.date))];
  const alerts = budgets.filter((b) => b.spent >= 0.8 * b.limit);

  return (
    <>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-[14px] font-medium text-muted">In</p>
          <p className="tabular text-[20px] font-semibold text-sage">{money(monthIn)}</p>
        </div>
        <div className="card">
          <p className="text-[14px] font-medium text-muted">Out</p>
          <p className="tabular text-[20px] font-semibold text-clay-dark">{money(monthOut)}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button className="btn btn-ghost" onClick={() => setTx("IN")}>
          + Money in
        </button>
        <button className="btn btn-primary" onClick={() => setTx("OUT")}>
          + Money out
        </button>
      </div>

      {alerts.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {alerts.map((b) => {
            const over = b.spent > b.limit;
            return (
              <li key={b.id} role="alert" className={`rounded-2xl px-4 py-3 text-[15px] ${over ? "bg-berry-soft text-berry" : "bg-honey-soft text-ink"}`}>
                <strong>{b.category}:</strong>{" "}
                {over ? `over budget by ${money(b.spent - b.limit)}` : `${Math.round((b.spent / b.limit) * 100)}% of budget used`}
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[20px] font-semibold">Budgets</h2>
          <button className="btn h-11 min-h-0 px-3 text-[15px] text-clay-dark" onClick={() => setBudget("new")}>
            + Set budget
          </button>
        </div>
        {budgets.length === 0 ? (
          <p className="card text-[15px] text-muted">Set a monthly limit for a category. You'll get a heads-up at 80% and an alert when you go over.</p>
        ) : (
          <ul className="card grid gap-4">
            {budgets.map((b) => {
              const pct = b.spent / b.limit;
              return (
                <li key={b.id}>
                  <button className="w-full text-left" onClick={() => setBudget(b)}>
                    <span className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{b.category}</span>
                      <span className="tabular shrink-0 text-[14px] text-muted">
                        {money(b.spent)} / {money(b.limit)}
                      </span>
                    </span>
                    <Bar pct={pct} tone={pct > 1 ? "berry" : pct >= 0.8 ? "honey" : "sage"} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <h2 className="mb-2 text-[20px] font-semibold">Entries</h2>
        {days.length === 0 && <p className="card text-[15px] text-muted">Nothing this month yet.</p>}
        {days.map((d) => (
          <div key={d} className="mb-4">
            <h3 className="mb-1.5 font-sans text-[14px] font-semibold text-muted">{d === today ? "Today" : fmtDay(d)}</h3>
            <ul className="card divide-y divide-line p-0">
              {txs
                .filter((t) => t.date === d)
                .map((t) => (
                  <li key={t.id}>
                    <button className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-left" onClick={() => setTx(t)}>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{t.category}</span>
                        {t.note && <span className="block truncate text-[13px] text-muted">{t.note}</span>}
                      </span>
                      <span className={`tabular shrink-0 font-semibold ${t.type === "IN" ? "text-sage" : ""}`}>
                        {t.type === "IN" ? "+" : "−"}
                        {money(t.amount)}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      <datalist id="cats">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <TxSheet tx={tx} today={today} onClose={() => setTx(null)} />
      <BudgetSheet budget={budget} onClose={() => setBudget(null)} />
    </>
  );
}

function TxSheet({ tx, today, onClose }: { tx: Tx | "IN" | "OUT" | null; today: string; onClose: () => void }) {
  const t = typeof tx === "object" ? tx : null;
  const type = t?.type ?? (tx as "IN" | "OUT" | null) ?? "OUT";
  return (
    <Sheet open={!!tx} onClose={onClose} title={t ? "Edit entry" : type === "IN" ? "Money in" : "Money out"}>
      <ActionForm action={saveTx} onDone={onClose}>
        {t && <input type="hidden" name="id" value={t.id} />}
        <div className="seg" role="radiogroup" aria-label="Type">
          <label>
            <input type="radio" name="type" value="OUT" defaultChecked={type === "OUT"} />
            <span>Out</span>
          </label>
          <label>
            <input type="radio" name="type" value="IN" defaultChecked={type === "IN"} />
            <span>In</span>
          </label>
        </div>
        <Field label="Amount">
          <input className="input tabular text-[20px] font-semibold" name="amount" inputMode="decimal" defaultValue={t?.amount ?? ""} required autoFocus={!t} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <input className="input" name="category" list="cats" defaultValue={t?.category ?? (type === "IN" ? "Salary" : "")} maxLength={30} required autoComplete="off" />
          </Field>
          <Field label="Date">
            <input className="input" name="date" type="date" defaultValue={t?.date ?? today} required />
          </Field>
        </div>
        <Field label="Note">
          <input className="input" name="note" defaultValue={t?.note} maxLength={200} placeholder="Optional" />
        </Field>
        <SubmitRow label={t ? "Save" : "Add"} onDelete={t ? async () => confirm("Delete this entry?") && (await callAction(() => deleteTx(t.id))) && onClose() : undefined} />
      </ActionForm>
    </Sheet>
  );
}

function BudgetSheet({ budget, onClose }: { budget: Budget | "new" | null; onClose: () => void }) {
  const b = budget && budget !== "new" ? budget : null;
  return (
    <Sheet open={!!budget} onClose={onClose} title={b ? "Edit budget" : "Monthly budget"}>
      <ActionForm action={saveBudget} onDone={onClose}>
        {b && <input type="hidden" name="id" value={b.id} />}
        <Field label="Category">
          <input className="input" name="category" list="cats" defaultValue={b?.category} maxLength={30} required autoComplete="off" />
        </Field>
        <Field label="Monthly limit">
          <input className="input tabular" name="monthlyLimit" inputMode="decimal" defaultValue={b?.limit ?? ""} required />
        </Field>
        <SubmitRow label="Save" onDelete={b ? async () => confirm("Remove this budget?") && (await callAction(() => deleteBudget(b.id))) && onClose() : undefined} />
      </ActionForm>
    </Sheet>
  );
}
