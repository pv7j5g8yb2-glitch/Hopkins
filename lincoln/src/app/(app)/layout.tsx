import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/session";
import { cases, kv, pendingApprovals } from "@/lib/queries";
import { EVENTS } from "@/lib/demo-events";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, firm } = await requireUser();
  const all = cases(firm.id);
  const step = Number(kv(firm.id, "demo_step") ?? "0");
  return (
    <div className="min-h-dvh">
      <Sidebar
        firm={firm.name}
        user={{ name: user.name, initials: user.initials, role: user.role }}
        approvals={pendingApprovals(firm.id).length}
        recent={all.slice(0, 3).map((c) => ({ id: c.id, client: c.client }))}
        demo={firm.demo ? { next: EVENTS[step]?.label ?? null } : null}
      />
      <main className="md:pl-[232px]">
        <div className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-6 md:px-10 md:pt-10">{children}</div>
      </main>
    </div>
  );
}
