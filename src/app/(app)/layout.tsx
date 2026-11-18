import { requireUser } from "@/lib/auth";
import { TabBar } from "@/components/tab-bar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <main
        className="mx-auto max-w-xl px-4"
        style={{ paddingTop: "calc(20px + env(safe-area-inset-top))", paddingBottom: "calc(104px + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
      <TabBar />
    </>
  );
}
