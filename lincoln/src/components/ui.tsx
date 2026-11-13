import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "neutral" | "ok" | "warn" | "risk" | "ink";
const TONES: Record<Tone, string> = {
  neutral: "bg-panel text-muted",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  risk: "bg-risk-bg text-risk",
  ink: "bg-ink text-canvas",
};

export function Chip({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-[5px] px-1.5 py-[1px] text-[11.5px] font-medium", TONES[tone], className)}>{children}</span>;
}

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  const c = { neutral: "bg-faint", ok: "bg-ok", warn: "bg-[#c98a00]", risk: "bg-risk", ink: "bg-ink" }[tone];
  return <span className={clsx("inline-block h-1.5 w-1.5 shrink-0 rounded-full", c)} />;
}

export function Avatar({ initials, size = 22 }: { initials: string; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-paper font-medium text-ink ring-1 ring-line" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initials}
    </span>
  );
}

export function PageHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="serif text-[24px] font-medium leading-tight">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-xl border border-line bg-white", className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-faint">{children}</h2>
      {right}
    </div>
  );
}

export const btn = {
  primary: "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 text-[13px] font-medium text-canvas transition hover:bg-black active:scale-[0.98] disabled:opacity-40",
  secondary: "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-ink transition hover:bg-panel active:scale-[0.98] disabled:opacity-40",
  ghost: "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted transition hover:bg-panel hover:text-ink",
};

export const STAGES = ["Intake", "Evidence", "Strategy", "Drafting", "Review", "Filed", "Decision"];

export function StageBar({ stage }: { stage: string }) {
  const i = STAGES.indexOf(stage);
  return (
    <ol className="flex items-center gap-1.5 overflow-x-auto">
      {STAGES.map((s, k) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={clsx("whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12px]", k < i && "text-muted", k === i && "bg-ink font-medium text-canvas", k > i && "text-faint")}>{s}</span>
          {k < STAGES.length - 1 && <span className={clsx("h-px w-4", k < i ? "bg-ink/40" : "bg-line")} />}
        </li>
      ))}
    </ol>
  );
}

export function stateTone(state: string): Tone {
  return state === "needs_you" ? "ink" : state === "moving" ? "ok" : "neutral";
}
export function stateLabel(state: string) {
  return state === "needs_you" ? "Needs you" : state === "moving" ? "Moving" : state === "waiting" ? "Waiting on others" : "Filed";
}
