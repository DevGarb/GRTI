import { cn } from "@/lib/utils";

export type Accent = "cyan" | "amber" | "violet" | "lime" | "magenta" | "blue";

export const accentVar: Record<Accent, string> = {
  cyan: "var(--tv-accent-cyan)",
  amber: "var(--tv-accent-amber)",
  violet: "var(--tv-accent-violet)",
  lime: "var(--tv-accent-lime)",
  magenta: "var(--tv-accent-magenta)",
  blue: "var(--tv-accent-blue)",
};

interface Props {
  accent?: Accent;
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
  grid?: boolean;
}

export function BentoTile({ accent = "cyan", className, children, padded = true, grid = false }: Props) {
  const color = `hsl(${accentVar[accent]})`;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border",
        "bg-[hsl(var(--tv-surface))]",
        "border-[hsl(var(--tv-border))]",
        "shadow-[0_1px_0_hsl(0_0%_100%/0.04)_inset,0_20px_40px_-24px_hsl(0_0%_0%/0.6)]",
        padded && "p-5",
        className,
      )}
    >
      {/* spine */}
      <div
        className="absolute left-0 top-0 h-full w-[2px]"
        style={{ background: `linear-gradient(180deg, ${color}, transparent 70%)` }}
      />
      {/* top glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-20"
        style={{ background: color }}
      />
      {grid && <div className="pointer-events-none absolute inset-0 tv-grid-bg opacity-[0.05]" />}
      <div className="relative">{children}</div>
    </div>
  );
}
