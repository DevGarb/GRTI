import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "crit" | "primary" | "neutral";

const toneStyles: Record<Tone, string> = {
  ok: "border-[hsl(var(--status-closed))]/40 bg-[hsl(var(--status-closed-bg))]",
  warn: "border-[hsl(var(--status-waiting))]/40 bg-[hsl(var(--status-waiting-bg))]",
  crit: "border-[hsl(var(--status-open))]/40 bg-[hsl(var(--status-open-bg))]",
  primary: "border-primary/40 bg-primary/5",
  neutral: "border-border bg-card",
};

const dotStyles: Record<Tone, string> = {
  ok: "bg-[hsl(var(--status-closed))]",
  warn: "bg-[hsl(var(--status-waiting))] animate-pulse",
  crit: "bg-[hsl(var(--status-open))] animate-pulse",
  primary: "bg-primary",
  neutral: "bg-muted-foreground",
};

interface Props {
  title: string;
  tone?: Tone;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function QuadrantCard({ title, tone = "neutral", eyebrow, children, footer, className }: Props) {
  return (
    <div className={cn("rounded-2xl border-2 shadow-lg p-5 flex flex-col gap-3", toneStyles[tone], className)}>
      <div className="flex items-center justify-between">
        <div>
          {eyebrow && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{eyebrow}</div>}
          <h3 className="text-sm md:text-base font-semibold uppercase tracking-wider">{title}</h3>
        </div>
        <span className={cn("h-3 w-3 rounded-full", dotStyles[tone])} />
      </div>
      <div className="flex-1 flex items-center justify-center">{children}</div>
      {footer && <div className="text-xs text-muted-foreground border-t border-border/50 pt-2">{footer}</div>}
    </div>
  );
}
