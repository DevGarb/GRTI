import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell, CheckCircle2, Star, Trophy, Timer,
  Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { computeOpStatus, opStatusLabel } from "@/lib/opStatus";
import { DailyKpiTile } from "@/components/tv/DailyKpiTile";
import { TodayTicket } from "@/components/tv/TodayTimelinePanel";
import { TodayAgendaPanel, computeAgendaRange, type AgendaFilter } from "@/components/tv/TodayAgendaPanel";
import { FunnelStrip } from "@/components/tv/FunnelStrip";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tv-dashboard`;

interface GoalsSummary {
  preventivas_target_total: number;
  csat_target_avg: number;
  points_target_total: number;
  tickets_target_total: number;
  rework_target_avg: number;
  tma_target_avg_hours: number;
  projects_target_total: number;
  points_actual_total: number;
  csat_actual_avg: number;
  csat_actual_count: number;
  rework_actual_percent: number;
  rework_month: number;
  tma_actual_hours: number;
  projects_actual_total: number;
  closed_month: number;
  active_sprints_backlog: number;
}

interface TvData {
  org: { name: string; slug: string };
  generated_at: string;
  kpis: {
    closed_today: number; closed_month: number;
    in_progress: number; open: number; awaiting: number; backlog: number;
    csat: number; csat_count: number;
    csat_today: number; csat_today_count: number;
    tma_minutes: number; tma_month_minutes: number; tma_today_minutes: number;
    active_techs: number; active_techs_today: number;
    first_response_min: number; aging_min: number;
  };
  ranking_today: Array<{ id: string; name: string; fechados: number }>;
  today_tickets: TodayTicket[];
  sla_alerts: Array<{ id: string; sla: string }>;
  preventivas_month: { total: number; feitas: number; pendentes: number; atrasadas: number };
  goals_summary: GoalsSummary | null;
}

function fmtHoursMin(minutes: number) {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export default function TvDashboard() {
  const { orgSlug } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [clock, setClock] = useState(new Date());
  const [tick, setTick] = useState(0);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (typeof window !== "undefined" && (localStorage.getItem("tv-theme") as "dark" | "light")) || "dark";
  });
  useEffect(() => {
    localStorage.setItem("tv-theme", theme);
  }, [theme]);

  useEffect(() => {
    const i = setInterval(() => { setClock(new Date()); setTick(t => t + 1); }, 1000);
    return () => clearInterval(i);
  }, []);

  const query = useQuery<TvData>({
    queryKey: ["tv-dashboard", orgSlug, token],
    enabled: !!orgSlug && !!token,
    refetchInterval: 300_000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const r = await fetch(`${FUNCTIONS_URL}?org=${encodeURIComponent(orgSlug!)}&token=${encodeURIComponent(token)}`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  });

  // Realtime: banner + som
  const [alert, setAlert] = useState<{ count: number; titles: string[] } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertTimeoutRef = useRef<number | null>(null);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  function playBeep() {
    try {
      if (!audioCtxRef.current) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current!;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      [880, 1175, 1568].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = now + i * 0.18;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch (e) { console.warn("beep failed", e); }
  }

  useEffect(() => {
    if (!orgSlug || !token) return;
    const channel = supabase
      .channel(`tv:${orgSlug}`, { config: { private: false } })
      .on("broadcast", { event: "new_ticket" }, (msg) => {
        const payload = (msg as any).payload ?? {};
        const title = payload.title ?? "Novo chamado";
        setAlert((prev) => {
          const titles = prev ? [title, ...prev.titles].slice(0, 3) : [title];
          const count = (prev?.count ?? 0) + 1;
          return { count, titles };
        });
        if (soundEnabledRef.current) playBeep();
        if (alertTimeoutRef.current) window.clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = window.setTimeout(() => setAlert(null), 15_000);
        query.refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (alertTimeoutRef.current) window.clearTimeout(alertTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug, token]);

  function enableSound() {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (Ctx && !audioCtxRef.current) audioCtxRef.current = new Ctx();
      audioCtxRef.current?.resume();
      setSoundEnabled(true);
      playBeep();
    } catch {}
  }

  const secondsSinceUpdate = useMemo(() => {
    if (!query.dataUpdatedAt) return 0;
    return Math.floor((Date.now() - query.dataUpdatedAt) / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.dataUpdatedAt, tick]);

  const opStatus = useMemo(() => {
    const d = query.data;
    if (!d) return null;
    return computeOpStatus({
      backlogTotal: d.kpis.backlog,
      awaitingApproval: d.kpis.awaiting,
      reworkPercent: d.goals_summary?.rework_actual_percent ?? 0,
      avgCsat: d.kpis.csat,
      csatCount: d.kpis.csat_count,
    });
  }, [query.data]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8"
        style={{ background: "hsl(var(--tv-bg))", color: "hsl(var(--tv-text))" }}>
        <div>
          <h1 className="font-display text-2xl font-bold mb-2">Token obrigatório</h1>
          <p className="text-[hsl(var(--tv-text-dim))]">Adicione <code className="font-mono-tech">?token=...</code> à URL.</p>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8"
        style={{ background: "hsl(var(--tv-bg))", color: "hsl(var(--tv-text))" }}>
        <div>
          <h1 className="font-display text-2xl font-bold mb-2 text-[hsl(var(--tv-accent-magenta))]">Acesso negado</h1>
          <p className="text-[hsl(var(--tv-text-dim))]">Token inválido ou organização inexistente.</p>
        </div>
      </div>
    );
  }

  const d = query.data;
  const dateStr = clock.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const topTech = d?.ranking_today[0];

  const opDot =
    opStatus === "critical" ? "hsl(var(--tv-accent-magenta))" :
    opStatus === "attention" ? "hsl(var(--tv-accent-amber))" :
    "hsl(var(--tv-accent-lime))";

  const topTechPct = topTech && d && d.kpis.closed_today > 0
    ? Math.round((topTech.fechados / d.kpis.closed_today) * 100)
    : 0;

  return (
    <div
      className={cn("min-h-screen p-4 md:p-6 flex flex-col gap-4 relative overflow-hidden", theme === "light" && "tv-light")}
      style={{
        background: "radial-gradient(1200px 600px at 15% -10%, hsl(var(--tv-accent-cyan)/0.08), transparent 60%), radial-gradient(900px 500px at 95% 110%, hsl(var(--tv-accent-violet)/0.08), transparent 60%), hsl(var(--tv-bg))",
        color: "hsl(var(--tv-text))",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* subtle grid */}
      <div className="pointer-events-none fixed inset-0 tv-grid-bg opacity-[0.04]" />

      {alert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-8">
          <div className="rounded-xl border-2 shadow-2xl px-6 py-4 flex items-center gap-4 max-w-2xl"
            style={{
              borderColor: "hsl(var(--tv-accent-magenta)/0.6)",
              background: "hsl(var(--tv-surface))",
              boxShadow: "0 0 40px hsl(var(--tv-accent-magenta)/0.25)",
            }}>
            <Bell className="h-8 w-8 animate-bounce shrink-0" style={{ color: "hsl(var(--tv-accent-magenta))" }} />
            <div>
              <div className="font-display font-bold text-lg" style={{ color: "hsl(var(--tv-accent-magenta))" }}>
                {alert.count === 1 ? "Novo chamado!" : `${alert.count} novos chamados!`}
              </div>
              <ul className="text-sm text-[hsl(var(--tv-text-dim))] mt-1 space-y-0.5">
                {alert.titles.map((t, i) => <li key={i} className="truncate max-w-lg">• {t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-tech text-[10px] tracking-[0.3em] text-[hsl(var(--tv-text-mute))] uppercase">
                CTRL · MONITOR
              </span>
              <span className="h-1 w-1 rounded-full bg-[hsl(var(--tv-accent-cyan))]" />
              <span className="font-mono-tech text-[10px] tracking-widest text-[hsl(var(--tv-text-mute))]">
                v3.2
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-[hsl(var(--tv-text))] mt-0.5">
              {d?.org.name ?? "Carregando…"}
            </h1>
          </div>
          {opStatus && (
            <div className="flex items-center gap-2 rounded-full border px-3.5 py-1.5"
              style={{ borderColor: `${opDot}55`, background: `${opDot}12` }}>
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: opDot, boxShadow: `0 0 8px ${opDot}` }} />
              <span className="text-xs font-medium uppercase tracking-widest" style={{ color: opDot }}>
                {opStatusLabel(opStatus)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            className="rounded-lg border px-2.5 py-1.5 hover:opacity-80 transition"
            style={{
              borderColor: "hsl(var(--tv-border-strong))",
              background: "hsl(var(--tv-surface))",
              color: "hsl(var(--tv-text))",
            }}
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {!soundEnabled && (
            <button
              onClick={enableSound}
              className="rounded-lg border px-3.5 py-1.5 text-xs font-medium hover:opacity-80 transition font-mono-tech"
              style={{
                borderColor: "hsl(var(--tv-accent-amber)/0.5)",
                background: "hsl(var(--tv-accent-amber)/0.1)",
                color: "hsl(var(--tv-accent-amber))",
              }}
            >
              ● ATIVAR SOM
            </button>
          )}
          <div className="text-right">
            <div className="font-display text-3xl md:text-4xl font-semibold tabular-nums text-[hsl(var(--tv-text))]">
              {timeStr}
            </div>
            <div className="text-xs text-[hsl(var(--tv-text-dim))] capitalize">{dateStr}</div>
            <div className="text-[10px] text-[hsl(var(--tv-text-mute))] mt-1 font-mono-tech flex items-center justify-end gap-1.5">
              <span>SYNC {secondsSinceUpdate.toString().padStart(2, "0")}s</span>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: query.isFetching ? "hsl(var(--tv-accent-amber))" : "hsl(var(--tv-accent-lime))",
                  boxShadow: `0 0 6px ${query.isFetching ? "hsl(var(--tv-accent-amber))" : "hsl(var(--tv-accent-lime))"}`,
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {!d ? (
        <div className="flex-1 flex items-center justify-center text-[hsl(var(--tv-text-mute))] font-mono-tech text-sm">
          [ LOADING TELEMETRY... ]
        </div>
      ) : (
        <>
          {/* Row 1: 4 KPIs do dia — full width */}
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <DailyKpiTile
              label="Fechados Hoje"
              value={d.kpis.closed_today}
              icon={CheckCircle2}
              accent="cyan"
              code="01"
              sub="Produtividade do dia"
            />
            <DailyKpiTile
              label="CSAT Hoje"
              value={d.kpis.csat_today > 0 ? d.kpis.csat_today.toFixed(1) : "—"}
              suffix={d.kpis.csat_today > 0 ? "/5" : undefined}
              icon={Star}
              accent="lime"
              code="02"
              sub={`${d.kpis.csat_today_count} avaliações`}
            />
            <DailyKpiTile
              label="Top Técnico"
              icon={Trophy}
              accent="amber"
              code="03"
              sub={topTech ? `${topTech.fechados} tickets · ${topTechPct}% da produção` : "Sem fechamentos hoje"}
            >
              <div className="flex flex-col gap-1">
                <span
                  className="font-display font-semibold leading-tight text-[hsl(var(--tv-text))] break-words"
                  style={{ fontSize: topTech && topTech.name.length > 14 ? "1.5rem" : "1.9rem", lineHeight: 1.05 }}
                >
                  {topTech?.name ?? "—"}
                </span>
              </div>
            </DailyKpiTile>
            <DailyKpiTile
              label="TMA Hoje"
              value={fmtHoursMin(d.kpis.tma_today_minutes)}
              icon={Timer}
              accent="violet"
              code="04"
              sub="Início → Finalização"
            />
          </section>

          {/* Row 2: Agenda do dia — destaque, full width */}
          <section>
            <TodayAgendaPanel tickets={d.today_tickets ?? []} />
          </section>

          {/* Rodapé: funil compacto */}
          <section>
            <FunnelStrip
              received={d.kpis.open + d.kpis.in_progress + d.kpis.awaiting + d.kpis.closed_today}
              inProgress={d.kpis.in_progress}
              awaiting={d.kpis.awaiting}
              closed={d.kpis.closed_today}
            />
          </section>
        </>
      )}
    </div>
  );
}
