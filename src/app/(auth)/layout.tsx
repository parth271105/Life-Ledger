import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Logo } from "@/lib/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await currentUser()) redirect("/");
  return (
    <main
      className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5"
      style={{ paddingTop: "calc(24px + env(safe-area-inset-top))", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
    >
      <div className="mb-8">
        <div className="mb-5 size-14 overflow-hidden rounded-2xl">
          <Logo size={56} />
        </div>
        <h1 className="text-[34px] leading-none font-semibold">Life Ledger</h1>
        <p className="mt-2 text-[16px] text-muted">Your days, tasks and money in one quiet place.</p>
      </div>
      {children}
    </main>
  );
}
