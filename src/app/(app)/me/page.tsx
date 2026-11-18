import { logout } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/ui";
import { PushToggle } from "./push-toggle";

export const metadata = { title: "Me · Life Ledger" };

const EXPORTS = [
  { kind: "goals", label: "Daily goals log" },
  { kind: "weight", label: "Weight" },
  { kind: "tasks", label: "Tasks" },
  { kind: "money", label: "Money entries" },
  { kind: "budgets", label: "Budgets" },
];

export default async function Me() {
  const me = await requireUser();
  return (
    <>
      <PageHead title="Me" sub={me.email} />

      <section className="card">
        <h2 className="text-[18px] font-semibold">Task reminders</h2>
        <p className="mt-1 text-[15px] text-muted">A notification the day before a task is due, and on the day.</p>
        <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      </section>

      <section className="card mt-4">
        <h2 className="text-[18px] font-semibold">Export to CSV</h2>
        <p className="mt-1 text-[15px] text-muted">Opens in Excel, Google Sheets or Numbers.</p>
        <ul className="mt-3 divide-y divide-line">
          {EXPORTS.map((e) => (
            <li key={e.kind}>
              <a href={`/api/export/${e.kind}`} download className="flex min-h-12 items-center justify-between font-medium">
                {e.label}
                <span className="text-[14px] font-semibold text-clay-dark">Download</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <form action={logout} className="mt-6">
        <button className="btn btn-ghost w-full">Log out</button>
      </form>
    </>
  );
}
