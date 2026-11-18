"use client";

import { useOptimistic, useState } from "react";
import { deleteBudget, deleteTx, saveBudget, saveTx } from "@/app/actions";
import { ActionForm, Bar, Field, Sheet, SubmitRow, isTemp, listOp, runOptimistic, tempId } from "@/components/ui";
import { fmtDay, money } from "@/lib/format";

type Tx = { id: string; amount: number; type: "IN" | "OUT"; category: string; date: string; note: string };
type Budget = { id: string; category: string; limit: number };

// Same clean-up the server does, so the optimistic row matches what gets saved.
const cleanCategory = (s: string) => s.trim().replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase());
const net = (list: Tx[]) => list.reduce((s, t) => s + (t.type === "IN" ? t.amount : -t.amount), 0);
const sum = (list: Tx[], type: Tx["type"]) => list.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);

export function MoneyView({
  today,
  month,
  balance,
  txs,
  budgets,
  categories,
  nav,
}: {
  today: string;
  month: string;
  balance: number;
  txs: Tx[];
  budgets: Budget[];
  categories: string[];
  nav: React.ReactNode;
}) {
  const [list, changeTx] = useOptimistic(txs, listOp<Tx>);
  const [bList, changeBudget] = useOptimistic(budgets, listOp<Budget>);
  const [tx, setTx] = useState<Tx | "IN" | "OUT" | null>(null);
  const [budget, setBudget] = useState<Budget | "new" | null>(null);

  const liveBalance = balance + net(list) - net(txs);
  const spentBy = new Map<string, number>();
  for (const t of list) if (t.type === "OUT") spentBy.set(t.category, (spentBy.get(t.category) ?? 0) + t.amount);
  const rows = bList.map((b) => ({ ...b, spent: spentBy.get(b.category) ?? 0 }));
  const alerts = rows.filter((b) => b.spent >= 0.8 * b.limit);

  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
  const days = [...new Set(sorted.map((t) => t.date))];

  const onSaveTx = (fd: FormData) => {
    const id = String(fd.get("id") || tempId());
    const item: Tx = {
      id,
      amount: Number(fd.get("amount")),
      type: fd.get("type") === "IN" ? "IN" : "OUT",
      category: cleanCategory(String(fd.get("category"))),
      date: String(fd.get("date")),
      note: String(fd.get("note") ?? "").trim(),
    };
    if (item.date.startsWith(month)) changeTx({ type: "upsert", item });
    else changeTx({ type: "delete", id }); // moved to another month: leaves this list
  };

  const onSaveBudget = (fd: FormData) => {
    const category = cleanCategory(String(fd.get("category")));
    const id = String(fd.get("id") || bList.find((b) => b.category === category)?.id || tempId());
    changeBudget({ type: "upsert", item: { id, category, limit: Number(fd.get("monthlyLimit")) } });
  };

  return (
    <>
      <section className="card">
        <p className="text-[14px] font-medium text-muted">Balance</p>
        <p className={`tabular text-[34px] leading-tight font-semibold ${liveBalance < 0 ? "text-berry" : ""}`}>{money(liveBalance)}</p>
      </section>

      {nav}

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-[14px] font-medium text-muted">In</p>
          <p className="tabular text-[20px] font-semibold text-sage">{money(sum(list, "IN"))}</p>
        </div>
        <div className="card">
          <p className="text-[14px] font-medium text-muted">Out</p>
          <p className="tabular text-[20px] font-semibold text-clay-dark">{money(sum(list, "OUT"))}</p>
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
        {rows.length === 0 ? (
          <p className="card text-[15px] text-muted">Set a monthly limit for a category. You'll get a heads-up at 80% and an alert when you go over.</p>
        ) : (
          <ul className="card grid gap-4">
            {rows.map((b) => {
              const pct = b.spent / b.limit;
              return (
                <li key={b.id}>
                  <button className="w-full text-left" onClick={() => !isTemp(b.id) && setBudget(b)}>
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
            <h3 className="mb-1.5 text-[14px] font-semibold text-muted">{d === today ? "Today" : fmtDay(d)}</h3>
            <ul className="card divide-y divide-line p-0">
              {sorted
                .filter((t) => t.date === d)
                .map((t) => (
                  <li key={t.id}>
                    <button
                      className={`flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${isTemp(t.id) ? "opacity-60" : ""}`}
                      onClick={() => !isTemp(t.id) && setTx(t)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{t.category}</span>
                        {(t.note || isTemp(t.id)) && <span className="block truncate text-[13px] text-muted">{isTemp(t.id) ? "Saving…" : t.note}</span>}
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
      <TxSheet
        tx={tx}
        today={today}
        onClose={() => setTx(null)}
        onSave={onSaveTx}
        onDelete={(id) => runOptimistic(() => changeTx({ type: "delete", id }), () => deleteTx(id))}
      />
      <BudgetSheet
        budget={budget}
        onClose={() => setBudget(null)}
        onSave={onSaveBudget}
        onDelete={(id) => runOptimistic(() => changeBudget({ type: "delete", id }), () => deleteBudget(id))}
      />
    </>
  );
}

type SheetProps<T> = { onClose: () => void; onSave: (fd: FormData) => void; onDelete: (id: string) => void } & T;

function TxSheet({ tx, today, onClose, onSave, onDelete }: SheetProps<{ tx: Tx | "IN" | "OUT" | null; today: string }>) {
  const t = typeof tx === "object" ? tx : null;
  const type = t?.type ?? (tx as "IN" | "OUT" | null) ?? "OUT";
  return (
    <Sheet open={!!tx} onClose={onClose} title={t ? "Edit entry" : type === "IN" ? "Money in" : "Money out"}>
      <ActionForm action={saveTx} onDone={onClose} optimistic={onSave}>
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
          <input
            className="input tabular text-[20px] font-semibold"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max="999999999"
            defaultValue={t?.amount ?? ""}
            required
            autoFocus={!t}
          />
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
        <SubmitRow
          label={t ? "Save" : "Add"}
          onDelete={
            t
              ? () => {
                  if (confirm("Delete this entry?")) {
                    onClose();
                    onDelete(t.id);
                  }
                }
              : undefined
          }
        />
      </ActionForm>
    </Sheet>
  );
}

function BudgetSheet({ budget, onClose, onSave, onDelete }: SheetProps<{ budget: Budget | "new" | null }>) {
  const b = budget && budget !== "new" ? budget : null;
  return (
    <Sheet open={!!budget} onClose={onClose} title={b ? "Edit budget" : "Monthly budget"}>
      <ActionForm action={saveBudget} onDone={onClose} optimistic={onSave}>
        {b && <input type="hidden" name="id" value={b.id} />}
        <Field label="Category">
          <input className="input" name="category" list="cats" defaultValue={b?.category} maxLength={30} required autoComplete="off" />
        </Field>
        <Field label="Monthly limit">
          <input className="input tabular" name="monthlyLimit" type="number" inputMode="decimal" step="0.01" min="0.01" max="999999999" defaultValue={b?.limit ?? ""} required />
        </Field>
        <SubmitRow
          label="Save"
          onDelete={
            b
              ? () => {
                  if (confirm("Remove this budget?")) {
                    onClose();
                    onDelete(b.id);
                  }
                }
              : undefined
          }
        />
      </ActionForm>
    </Sheet>
  );
}
