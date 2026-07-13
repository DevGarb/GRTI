import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Users, Timer, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { computeOpStatus, opStatusLabel, opStatusEmoji } from "@/lib/opStatus";
import { QuadrantCard } from "@/components/tv/QuadrantCard";
import { GaugeRing } from "@/components/tv/GaugeRing";
import { OkrCard } from "@/components/tv/OkrCard";
import { FunnelBar } from "@/components/tv/FunnelBar";
import { CriticalAlertsPanel } from "@/components/tv/CriticalAlertsPanel";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tv-dashboard`;

interface TvData {
  org: { name: string; slug: string };
  generated_at: string;
  kpis: {
    closed_today: number; in_progress: number; open: number; awaiting: number; backlog: number;
    csat: number; csat_count: number; tma_minutes: number; active_techs: number;
  };
  open_queue: Array<{ id: string; title: string; priority: string; category: string; requester: string; waiting_min: number; sla: "ok" | "warn" | "crit" }>;
  in_progress_list: Array<{ id: string; title: string; priority: string; category: string; technician: string; elapsed_min: number; sla: "ok" | "warn" | "crit" }>;
  ranking_today: Array<{ id: string; name: string; fechados: number }>;
  sla_alerts: Array<{ id: string; title: string; priority: string; sla: string; minutes: number }>;
  preventivas_month: { total: number; feitas: number; pendentes: number; atrasadas: number };
}

// TODO: buscar metas reais de `goals` por org
const DEFAULT_TARGETS = {
  dailyClosed: 15,
  monthlyClosed: 200,
  csatTarget: 4.5,
  backlogCeiling: 20,
};

function fmtMin(m: number) {
  if (!m || m <= 0) return "—";
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  if (h >= 10) return `${Math.floor(h / 10)}d ${h % 10}h`;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function statusBadgeClasses(status: "normal" | "attention" | "critical") {
  return status === "normal"
    ? "border-[hsl(var(--status-closed))] bg-[hsl(var(--status-closed-bg))] text-[hsl(var(--status-closed))]"
    : status === "attention"
    ? "border-[hsl(var(--status-waiting))] bg-[hsl(var(--status-waiting-bg))] text-[hsl(var(--status-waiting))]"
    : "border-[hsl(var(--status-open))] bg-[hsl(var(--status-open-bg))] text-[hsl(var(--status-open))]";
}

export default function TvDashboard() {
  const { orgSlug } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [clock, setClock] = useState(new Date());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => { document.documentElement.classList.remove("dark"); };
  }, []);

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

  // Realtime: banner + som ao inserir chamado
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

  // Derivações para os quadrantes
  const derived = useMemo(() => {
    const d = query.data;
    if (!d) return null;
    const active = d.kpis.open + d.kpis.in_progress + d.kpis.awaiting;
    const critCount = d.sla_alerts.filter(a => a.sla === "crit").length;
    const warnCount = d.sla_alerts.filter(a => a.sla === "warn").length;
    const outOfSla = critCount + warnCount;
    const slaOkPct = active > 0 ? Math.max(0, ((active - outOfSla) / active) * 100) : 100;

    // Top categorias em alerta
    const catMap = new Map<string, number>();
    for (const t of [...d.open_queue, ...d.in_progress_list]) {
      if (t.sla !== "ok") catMap.set(t.category, (catMap.get(t.category) ?? 0) + 1);
    }
    const topCategories = Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const csatPct = d.kpis.csat > 0 ? (d.kpis.csat / 5) * 100 : 0;
    const loadPerTech = d.kpis.active_techs > 0 ? d.kpis.in_progress / d.kpis.active_techs : 0;

    const opStatus = computeOpStatus({
      backlogTotal: d.kpis.backlog,
      awaitingApproval: d.kpis.awaiting,
      reworkPercent: 0,
      avgCsat: d.kpis.csat,
      csatCount: d.kpis.csat_count,
    });

    return { active, critCount, warnCount, slaOkPct, topCategories, csatPct, loadPerTech, opStatus };
  }, [query.data]);

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Token obrigatório</h1>
          <p className="text-muted-foreground">Adicione <code>?token=...</code> à URL para acessar o painel.</p>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 text-[hsl(var(--status-open))]">Acesso negado</h1>
          <p className="text-muted-foreground">Token inválido ou organização inexistente.</p>
        </div>
      </div>
    );
  }

  const d = query.data;
  const dateStr = clock.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Tones dos quadrantes
  const q1Progress = d ? Math.min(100, (d.kpis.closed_today / DEFAULT_TARGETS.dailyClosed) * 100) : 0;
  const q1Tone = q1Progress >= 100 ? "ok" : q1Progress >= 60 ? "primary" : "warn";
  const q2Tone = derived ? (derived.slaOkPct >= 90 ? "ok" : derived.slaOkPct >= 70 ? "warn" : "crit") : "neutral";
  const q3Tone = d && d.kpis.csat > 0
    ? (d.kpis.csat >= 4.5 ? "ok" : d.kpis.csat >= 3.5 ? "warn" : "crit")
    : "neutral";
  const q4Tone = derived
    ? (derived.loadPerTech > 8 ? "warn" : derived.loadPerTech > 12 ? "crit" : "primary")
    : "neutral";

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 flex flex-col gap-4 relative">
      {alert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-8">
          <div className="rounded-xl border-2 border-[hsl(var(--status-open))] bg-[hsl(var(--status-open-bg))] shadow-2xl px-6 py-4 flex items-center gap-4 max-w-2xl">
            <Bell className="h-8 w-8 text-[hsl(var(--status-open))] animate-bounce shrink-0" />
            <div>
              <div className="font-bold text-lg text-[hsl(var(--status-open))]">
                {alert.count === 1 ? "Novo chamado!" : `${alert.count} novos chamados!`}
              </div>
              <ul className="text-sm text-foreground/80 mt-1 space-y-0.5">
                {alert.titles.map((t, i) => <li key={i} className="truncate max-w-lg">• {t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">War Room · Monitoramento</div>
            <h1 className="text-2xl md:text-3xl font-bold">{d?.org.name ?? "Carregando…"}</h1>
          </div>
          {derived && (
            <div className={cn(
              "rounded-full border-2 px-4 py-1.5 text-sm font-bold flex items-center gap-2",
              statusBadgeClasses(derived.opStatus)
            )}>
              <span>{opStatusEmoji(derived.opStatus)}</span>
              <span>{opStatusLabel(derived.opStatus)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!soundEnabled && (
            <button
              onClick={enableSound}
              className="rounded-lg border border-[hsl(var(--status-waiting))] bg-[hsl(var(--status-waiting-bg))] text-[hsl(var(--status-waiting))] px-4 py-2 text-sm font-medium hover:opacity-80 transition"
            >
              🔔 Ativar som de alerta
            </button>
          )}
          <div className="text-right">
            <div className="text-3xl md:text-4xl font-bold tabular-nums">{timeStr}</div>
            <div className="text-sm text-muted-foreground capitalize">{dateStr}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Atualizado há {secondsSinceUpdate}s
              <span className={cn("inline-block ml-2 h-2 w-2 rounded-full", query.isFetching ? "bg-[hsl(var(--status-waiting))] animate-pulse" : "bg-[hsl(var(--status-closed))]")} />
            </div>
          </div>
        </div>
      </header>

      {!d || !derived ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Carregando indicadores…</div>
      ) : (
        <>
          {/* 4 Quadrantes principais */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Q1 Produção */}
            <QuadrantCard
              title="Produção do Dia"
              eyebrow="Q1"
              tone={q1Tone as any}
              footer={<span>Meta diária: <b>{DEFAULT_TARGETS.dailyClosed}</b> · Fechados: <b>{d.kpis.closed_today}</b></span>}
            >
              <div className="w-full flex flex-col items-center gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold tabular-nums text-[hsl(var(--status-closed))]">{d.kpis.closed_today}</span>
                  <span className="text-lg text-muted-foreground">/ {DEFAULT_TARGETS.dailyClosed}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-[hsl(var(--status-closed))] transition-all duration-700"
                    style={{ width: `${q1Progress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">{Math.round(q1Progress)}% da meta</div>
              </div>
            </QuadrantCard>

            {/* Q2 SLA */}
            <QuadrantCard
              title="SLA no Prazo"
              eyebrow="Q2"
              tone={q2Tone as any}
              footer={<span>Ativos: <b>{derived.active}</b> · Fora do SLA: <b className="text-[hsl(var(--status-open))]">{derived.critCount + derived.warnCount}</b></span>}
            >
              <GaugeRing value={derived.slaOkPct} tone={q2Tone as any} sub="no prazo" size={170} />
            </QuadrantCard>

            {/* Q3 CSAT */}
            <QuadrantCard
              title="Qualidade (CSAT)"
              eyebrow="Q3"
              tone={q3Tone as any}
              footer={<span>{d.kpis.csat_count} avaliações (30d) · Meta: <b>{DEFAULT_TARGETS.csatTarget}</b></span>}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-baseline gap-1">
                  <Star className={cn(
                    "h-8 w-8",
                    q3Tone === "ok" && "fill-[hsl(var(--status-closed))] text-[hsl(var(--status-closed))]",
                    q3Tone === "warn" && "fill-[hsl(var(--status-waiting))] text-[hsl(var(--status-waiting))]",
                    q3Tone === "crit" && "fill-[hsl(var(--status-open))] text-[hsl(var(--status-open))]",
                    q3Tone === "neutral" && "text-muted-foreground",
                  )} />
                  <span className={cn(
                    "text-6xl font-bold tabular-nums",
                    q3Tone === "ok" && "text-[hsl(var(--status-closed))]",
                    q3Tone === "warn" && "text-[hsl(var(--status-waiting))]",
                    q3Tone === "crit" && "text-[hsl(var(--status-open))]",
                  )}>{d.kpis.csat > 0 ? d.kpis.csat.toFixed(2) : "—"}</span>
                  <span className="text-lg text-muted-foreground">/ 5</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      className={cn(
                        "h-5 w-5",
                        i <= Math.round(d.kpis.csat)
                          ? "fill-[hsl(var(--status-waiting))] text-[hsl(var(--status-waiting))]"
                          : "text-muted-foreground/40"
                      )}
                    />
                  ))}
                </div>
              </div>
            </QuadrantCard>

            {/* Q4 Capacidade */}
            <QuadrantCard
              title="Capacidade"
              eyebrow="Q4"
              tone={q4Tone as any}
              footer={<span>Carga por técnico: <b>{derived.loadPerTech.toFixed(1)}</b> chamados</span>}
            >
              <div className="w-full grid grid-cols-2 gap-3">
                <div className="text-center">
                  <Users className="h-6 w-6 mx-auto text-primary mb-1" />
                  <div className="text-4xl font-bold tabular-nums">{d.kpis.active_techs}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Técnicos ativos</div>
                </div>
                <div className="text-center">
                  <Timer className="h-6 w-6 mx-auto text-primary mb-1" />
                  <div className="text-4xl font-bold tabular-nums">{fmtMin(d.kpis.tma_minutes)}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">TMA médio</div>
                </div>
              </div>
            </QuadrantCard>
          </section>

          {/* OKRs do mês */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">OKRs do Mês</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <OkrCard
                title="Fechamentos do mês"
                current={d.kpis.closed_today /* proxy: sem métrica mensal no payload atual */}
                target={DEFAULT_TARGETS.monthlyClosed}
              />
              <OkrCard
                title="CSAT ≥ 4.5"
                current={d.kpis.csat}
                target={DEFAULT_TARGETS.csatTarget}
                format={(v) => v.toFixed(2)}
              />
              <OkrCard
                title="Preventivas do mês"
                current={d.preventivas_month.feitas}
                target={Math.max(1, d.preventivas_month.total)}
              />
              <OkrCard
                title={`Backlog < ${DEFAULT_TARGETS.backlogCeiling}`}
                current={d.kpis.backlog}
                target={DEFAULT_TARGETS.backlogCeiling}
                higherIsBetter={false}
              />
            </div>
          </section>

          {/* Funil + Alertas Críticos */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">
            <div className="xl:col-span-2 rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Fluxo Operacional</h3>
                <span className="text-xs text-muted-foreground">Distribuição do funil</span>
              </div>
              <FunnelBar segments={[
                { label: "Aberto", value: d.kpis.open, color: "hsl(var(--status-open))" },
                { label: "Em andamento", value: d.kpis.in_progress, color: "hsl(var(--primary))" },
                { label: "Aguard. aprov.", value: d.kpis.awaiting, color: "hsl(var(--status-waiting))" },
                { label: "Fechados hoje", value: d.kpis.closed_today, color: "hsl(var(--status-closed))" },
              ]} />

              {/* Ranking compacto */}
              {d.ranking_today.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Top 3 técnicos hoje</div>
                  <div className="grid grid-cols-3 gap-2">
                    {d.ranking_today.slice(0, 3).map((r, i) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-lg border bg-background/50 p-2">
                        <span className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                          i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                          i === 1 ? "bg-gray-400/20 text-gray-300" :
                          "bg-orange-500/20 text-orange-500"
                        )}>{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.fechados} fechados</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <CriticalAlertsPanel
              crit={derived.critCount}
              warn={derived.warnCount}
              topCategories={derived.topCategories}
            />
          </section>
        </>
      )}
    </div>
  );
}
