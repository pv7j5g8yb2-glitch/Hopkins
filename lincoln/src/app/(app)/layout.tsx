import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/session";
import { kv, pendingApprovals, recentCases } from "@/lib/queries";
import { EVENTS } from "@/lib/demo-events";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, firm, viewer } = await requireUser();
  const step = Number(kv(firm.id, "demo_step") ?? "0");
  return (
    <div className="min-h-dvh">
      <Sidebar
        firm={firm.name}
        user={{ name: user.name, initials: user.initials, avatar: user.avatar }}
        review={pendingApprovals(firm.id, viewer).length}
        recent={recentCases(firm.id, 7, viewer).map((c) => ({ id: c.id, client: c.client }))}
        demo={firm.demo ? { next: EVENTS[step]?.label ?? null } : null}
      />
      <main className="app-main md:pl-[248px]">
        <div className="mx-auto w-full max-w-[1040px] px-4 pb-24 pt-6 md:px-12 md:pt-12">{children}</div>
      </main>
    </div>
  );
}
