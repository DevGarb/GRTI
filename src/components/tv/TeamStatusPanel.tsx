import { Users, CheckCircle2, Activity, AlertTriangle, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { accentVar } from "./BentoTile";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export interface TeamMemberStatus {
  id: string;
  name: string;
  closed_today: number;
  in_progress: number;
  unstarted: number;
  idle: boolean;
  projects_in_dev?: number;
  closed_titles?: string[];
  in_progress_titles?: string[];
  unstarted_titles?: string[];
  project_titles?: string[];
}


function firstAndLast(name: string) {
  const parts = (name ?? "").trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function TitleList({
  label,
  color,
  titles,
  Icon,
}: {
  label: string;
  color: string;
  titles: string[];
  Icon: typeof CheckCircle2;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color }}>
          {label} ({titles.length})
        </span>
      </div>
      {titles.length ? (
        <ul className="space-y-1">
          {titles.map((t, i) => (
            <li key={i} className="text-[13px] leading-snug text-[hsl(var(--tv-text))] line-clamp-2">
              • {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-[hsl(var(--tv-text-dim))]">Nenhum item</p>
      )}
    </div>
  );
}


function MemberCardBody({ m }: { m: TeamMemberStatus }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-3",
        "bg-[hsl(var(--tv-surface))]",
        m.idle
          ? "border-[hsl(var(--tv-accent-red))] tv-idle-pulse"
          : "border-[hsl(var(--tv-border))]",
        "shadow-[0_1px_0_hsl(0_0%_100%/0.04)_inset,0_20px_40px_-24px_hsl(0_0%_0%/0.6)]",
      )}
    >
      <div
        className="absolute left-0 top-0 h-full w-[2px]"
        style={{
          background: `linear-gradient(180deg, hsl(var(${m.idle ? "--tv-accent-red" : "--tv-accent-cyan"})), transparent 70%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <span
            className="font-tv-display font-semibold leading-tight text-[hsl(var(--tv-text))] truncate whitespace-nowrap"
            style={{ fontSize: "1.15rem", lineHeight: 1.1 }}
          >
            {firstAndLast(m.name)}
          </span>
          {m.idle && (
            <span className="shrink-0 flex items-center gap-1 rounded-md border border-[hsl(var(--tv-accent-red)/0.6)] bg-[hsl(var(--tv-accent-red)/0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--tv-accent-red))]">
              <AlertTriangle className="h-3 w-3" strokeWidth={2} />
              Ocioso
            </span>
          )}
        </div>

        <div className="mt-2 flex items-end gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[hsl(var(--tv-text-dim))]">
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: `hsl(${accentVar.cyan})` }} />
              <span className="text-[11px] uppercase tracking-[0.16em]">Fechados</span>
            </div>
            <div
              className="font-tv-display font-semibold tabular-nums leading-none mt-1"
              style={{ fontSize: "1.75rem", color: `hsl(${accentVar.cyan})` }}
            >
              {m.closed_today}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[hsl(var(--tv-text-dim))]">
              <Activity className="h-3.5 w-3.5" style={{ color: `hsl(${accentVar.amber})` }} />
              <span className="text-[11px] uppercase tracking-[0.16em]">Andamento</span>
            </div>
            <div
              className="font-tv-display font-semibold tabular-nums leading-none mt-1"
              style={{ fontSize: "1.75rem", color: `hsl(${accentVar.amber})` }}
            >
              {m.in_progress}
            </div>
          </div>
          {(m.projects_in_dev ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[hsl(var(--tv-text-dim))]">
                <Code2 className="h-3.5 w-3.5" style={{ color: `hsl(${accentVar.violet})` }} />
                <span className="text-[11px] uppercase tracking-[0.16em]">Projetos</span>
              </div>
              <div
                className="font-tv-display font-semibold tabular-nums leading-none mt-1"
                style={{ fontSize: "1.75rem", color: `hsl(${accentVar.violet})` }}
              >
                {m.projects_in_dev}
              </div>
            </div>
          )}
        </div>

        {m.unstarted > 0 && (
          <div
            className="mt-2 text-[12px] font-mono-tech"
            style={{ color: m.idle ? "hsl(var(--tv-accent-red))" : `hsl(${accentVar.amber})` }}
          >
            {m.unstarted} chamado{m.unstarted > 1 ? "s" : ""} sem iniciar
          </div>
        )}
      </div>
    </div>
  );
}

function MemberCard({ m }: { m: TeamMemberStatus }) {
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div className="cursor-default">
          <MemberCardBody m={m} />
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-80 space-y-3 border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface))] text-[hsl(var(--tv-text))] shadow-2xl"
      >
        <div className="font-tv-display text-[15px] font-semibold">{m.name}</div>
        <TitleList
          label="Fechados hoje"
          color={`hsl(${accentVar.cyan})`}
          titles={m.closed_titles ?? []}
          Icon={CheckCircle2}
        />
        <TitleList
          label="Andamento"
          color={`hsl(${accentVar.amber})`}
          titles={m.in_progress_titles ?? []}
          Icon={Activity}
        />
        {(m.unstarted_titles?.length ?? 0) > 0 && (
          <TitleList
            label="Sem iniciar"
            color={`hsl(var(--tv-accent-red))`}
            titles={m.unstarted_titles ?? []}
            Icon={AlertTriangle}
          />
        )}
        {(m.project_titles?.length ?? 0) > 0 && (
          <TitleList
            label="Em desenvolvimento"
            color={`hsl(${accentVar.violet})`}
            titles={m.project_titles ?? []}
            Icon={Code2}
          />
        )}

      </HoverCardContent>
    </HoverCard>
  );
}



export function TeamStatusPanel({ team }: { team: TeamMemberStatus[] }) {
  if (!team?.length) return null;
  const idleCount = team.filter(t => t.idle).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" style={{ color: `hsl(${accentVar.cyan})` }} strokeWidth={1.75} />
          <span className="text-[13px] uppercase tracking-[0.22em] text-[hsl(var(--tv-text))] font-semibold">
            Equipe Agora
          </span>
        </div>
        <span className="font-mono-tech text-[12px] text-[hsl(var(--tv-text-dim))] tracking-widest">
          {team.length} TÉCNICOS · {idleCount} OCIOSO{idleCount === 1 ? "" : "S"}
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {team.map(m => <MemberCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}
