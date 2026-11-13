"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import clsx from "clsx";
import { BookOpen, CalendarCheck, ChevronDown, CircleCheck, CircleHelp, FolderClosed, Inbox, LogOut, Menu, PieChart, Play, Plug, Plus, RotateCcw, Settings, Sparkles, X } from "lucide-react";
import { advanceDemo, resetDemoAction, signOut } from "@/lib/actions";

type Props = {
  firm: string;
  user: { name: string; initials: string; role: string };
  approvals: number;
  recent: { id: string; client: string }[];
  demo: { next: string | null } | null;
};

function Mark() {
  return (
    <span className="wordmark flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-ink text-[14px] leading-none text-canvas">L</span>
  );
}

export default function Sidebar({ firm, user, approvals, recent, demo }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => setOpen(false), [path]);

  const item = (href: string, label: string, Icon: typeof Inbox, badge?: number) => {
    const active = href === "/" ? path === "/" : path.startsWith(href);
    return (
      <Link href={href} className={clsx("group flex h-[30px] items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition", active ? "bg-panel font-medium text-ink" : "text-[#4a4843] hover:bg-panel/70 hover:text-ink")}>
        <Icon size={15} strokeWidth={active ? 2 : 1.6} className="shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {badge ? <span className="rounded-full bg-ink px-1.5 text-[10.5px] font-medium leading-[16px] text-canvas">{badge}</span> : null}
      </Link>
    );
  };

  const body = (
    <div className="flex h-full flex-col px-2.5 pb-3 pt-3.5">
      <div className="mb-3 flex items-center justify-between px-1.5">
        <Link href="/" className="flex items-center gap-2">
          <Mark />
          <span className="wordmark text-[17px]">Lincoln</span>
        </Link>
        <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted md:hidden" aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      <div className="mb-2 flex items-center gap-1 px-2 text-[12.5px] text-muted">
        <span className="truncate">{firm}</span>
        <ChevronDown size={12} />
      </div>
      <Link href="/cases/new" className="mb-3 flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-white text-[13px] font-medium transition hover:bg-panel">
        <Plus size={14} /> New case
      </Link>
      <nav className="flex flex-col gap-[2px]">
        {item("/", "Today", CalendarCheck)}
        {item("/cases", "Cases", FolderClosed)}
        <div className="mb-1 ml-[26px] flex flex-col border-l border-line pl-2">
          {recent.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`} className={clsx("truncate rounded-md px-2 py-[5px] text-[12.5px] transition hover:text-ink", path === `/cases/${c.id}` ? "font-medium text-ink" : "text-muted")}>
              {c.client}
            </Link>
          ))}
        </div>
        {item("/approvals", "Approvals", CircleCheck, approvals)}
        {item("/inbox", "Inbox", Inbox)}
        {item("/assistant", "Assistant", Sparkles)}
        {item("/library", "Library", BookOpen)}
        {item("/integrations", "Integrations", Plug)}
      </nav>
      <div className="mt-auto flex flex-col gap-[2px] pt-4">
        {demo && (
          <div className="mb-2 rounded-xl border border-dashed border-[#d6d2cb] bg-white p-2.5">
            <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.07em] text-faint">Demo world</div>
            {demo.next ? (
              <>
                <p className="mb-2 text-[12px] leading-snug text-muted">Next: {demo.next}</p>
                <button disabled={pending} onClick={() => start(() => advanceDemo())} className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-ink text-[12px] font-medium text-canvas transition active:scale-[0.98] disabled:opacity-50">
                  <Play size={11} fill="currentColor" /> {pending ? "Happening…" : "Make it happen"}
                </button>
              </>
            ) : (
              <p className="mb-2 text-[12px] leading-snug text-muted">Every scripted event has played.</p>
            )}
            <button disabled={pending} onClick={() => start(() => resetDemoAction())} className="mt-1.5 flex h-6 w-full items-center justify-center gap-1.5 rounded-md text-[11.5px] text-faint transition hover:text-ink">
              <RotateCcw size={11} /> Reset the demo
            </button>
          </div>
        )}
        {item("/report", "Lincoln report", PieChart)}
        {item("/settings", "Settings", Settings)}
        {item("/help", "Help", CircleHelp)}
        <div className="mt-2 flex items-center gap-2 border-t border-line px-1.5 pt-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper text-[11px] font-medium ring-1 ring-line">{user.initials}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12.5px] font-medium">{user.name}</div>
            <div className="truncate text-[11.5px] text-faint">{user.role}</div>
          </div>
          <button onClick={() => start(() => signOut())} className="rounded-md p-1.5 text-faint transition hover:bg-panel hover:text-ink" aria-label="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Mark />
          <span className="wordmark text-[17px]">Lincoln</span>
        </Link>
        <button onClick={() => setOpen(true)} className="relative rounded-md p-1.5" aria-label="Open menu">
          <Menu size={20} />
          {approvals > 0 && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-ink ring-2 ring-canvas" />}
        </button>
      </header>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[232px] border-r border-line bg-canvas md:block">{body}</aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/25" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] overflow-y-auto bg-canvas shadow-xl">{body}</aside>
        </div>
      )}
    </>
  );
}
