import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/** Cabeçalho padrão das páginas do GRCheck (apresentação apenas). */
export function ChkPageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--chk-primary)/0.10)] text-[hsl(var(--chk-primary))] ring-1 ring-[hsl(var(--chk-primary)/0.18)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[hsl(var(--chk-text-dim))] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}

/** Estado vazio ilustrado. */
export function ChkEmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-elevated flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="text-xs text-[hsl(var(--chk-text-dim))] max-w-sm">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Skeleton de lista para estados de carregamento. */
export function ChkListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card-elevated divide-y divide-[hsl(var(--chk-border))]" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4">
          <div className="h-9 w-9 rounded-lg bg-[hsl(var(--chk-surface-3))] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded bg-[hsl(var(--chk-surface-3))] animate-pulse" />
            <div className="h-2.5 w-1/4 rounded bg-[hsl(var(--chk-surface-3))] animate-pulse" />
          </div>
          <div className="h-5 w-20 rounded-full bg-[hsl(var(--chk-surface-3))] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export type ChkTone = "neutral" | "info" | "ok" | "warn" | "danger";

const toneClass: Record<ChkTone, string> = {
  neutral: "chk-badge-neutral",
  info: "chk-badge-info",
  ok: "chk-badge-ok",
  warn: "chk-badge-warn",
  danger: "chk-badge-danger",
};

export function ChkBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: ChkTone;
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("chk-badge", toneClass[tone], className)}>{children}</span>;
}

const kpiAccent: Record<ChkTone, string> = {
  neutral: "hsl(var(--chk-text-dim))",
  info: "hsl(var(--chk-info))",
  ok: "hsl(var(--chk-ok))",
  warn: "hsl(var(--chk-warn))",
  danger: "hsl(var(--chk-danger))",
};

/** Card de KPI com faixa de acento. */
export function ChkKpiCard({
  label,
  value,
  tone = "neutral",
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: ChkTone;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}) {
  const color = kpiAccent[tone];
  return (
    <div className={cn("card-elevated relative overflow-hidden p-4 sm:p-5", className)}>
      <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between gap-2">
        <p className="chk-eyebrow">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color }} />}
      </div>
      <p className="mt-1.5 text-2xl sm:text-3xl font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-[hsl(var(--chk-text-dim))]">{hint}</p>}
    </div>
  );
}
