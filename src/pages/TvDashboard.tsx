import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

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

function fmtMin(m: number) {
  if (!m || m <= 0) return "—";
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  if (h >= 10) return `${Math.floor(h / 10)}d ${h % 10}h`;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function slaColor(sla: string) {
  if (sla === "crit") return "text-[hsl(var(--status-open))]";
  if (sla === "warn") return "text-[hsl(var(--status-waiting))]";
  return "text-muted-foreground";
}

function KpiCard({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" | "warn" | "ok" | "primary" }) {
  return (
    <div className={cn(
      "rounded-xl border p-5 bg-card shadow-sm",
      tone === "danger" && "border-[hsl(var(--status-open))]/40 bg-[hsl(var(--status-open-bg))]",
      tone === "warn" && "border-[hsl(var(--status-waiting))]/40 bg-[hsl(var(--status-waiting-bg))]",
      tone === "ok" && "border-[hsl(var(--status-closed))]/40 bg-[hsl(var(--status-closed-bg))]",
    )}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className={cn(
        "text-4xl md:text-5xl font-bold mt-2 tabular-nums",
        tone === "danger" && "text-[hsl(var(--status-open))]",
        tone === "warn" && "text-[hsl(var(--status-waiting))]",
        tone === "ok" && "text-[hsl(var(--status-closed))]",
      )}>{value}</div>
    </div>
  );
}

function Panel({ title, badge, children, className }: { title: string; badge?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden", className)}>
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-lg">{title}</h2>
        {badge}
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
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
    refetchInterval: 20_000,
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

  // Detect new tickets between refetches and trigger sound + banner
  const knownIdsRef = useRef<Set<string> | null>(null);
  const [alert, setAlert] = useState<{ count: number; titles: string[] } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

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
      // 3-note attention chime
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
    } catch (e) {
      console.warn("beep failed", e);
    }
  }

  useEffect(() => {
    const data = query.data;
    if (!data) return;
    const currentIds = new Set(data.open_queue.map(t => t.id));
    if (knownIdsRef.current === null) {
      // First load — seed baseline, no alert
      knownIdsRef.current = currentIds;
      return;
    }
    const newOnes = data.open_queue.filter(t => !knownIdsRef.current!.has(t.id));
    if (newOnes.length > 0) {
      setAlert({ count: newOnes.length, titles: newOnes.map(t => t.title).slice(0, 3) });
      if (soundEnabled) playBeep();
      setTimeout(() => setAlert(null), 15_000);
    }
    knownIdsRef.current = currentIds;
  }, [query.data, soundEnabled]);

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

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Painel de Monitoramento</div>
          <h1 className="text-2xl md:text-3xl font-bold">{d?.org.name ?? "Carregando…"}</h1>
        </div>
        <div className="text-right">
          <div className="text-3xl md:text-4xl font-bold tabular-nums">{timeStr}</div>
          <div className="text-sm text-muted-foreground capitalize">{dateStr}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Atualizado há {secondsSinceUpdate}s
            <span className={cn("inline-block ml-2 h-2 w-2 rounded-full", query.isFetching ? "bg-[hsl(var(--status-waiting))] animate-pulse" : "bg-[hsl(var(--status-closed))]")} />
          </div>
        </div>
      </header>

      {!d ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Carregando dados…</div>
      ) : (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <KpiCard label="Finalizados hoje" value={d.kpis.closed_today} tone="ok" />
            <KpiCard label="Em andamento" value={d.kpis.in_progress} tone="primary" />
            <KpiCard label="Em aberto" value={d.kpis.open} tone={d.kpis.open >= 10 ? "warn" : undefined} />
            <KpiCard label="Aguardando aprov." value={d.kpis.awaiting} />
            <KpiCard label="Backlog total" value={d.kpis.backlog} tone={d.kpis.backlog >= 20 ? "warn" : undefined} />
            <KpiCard label="TMA médio" value={fmtMin(d.kpis.tma_minutes)} />
            <KpiCard label={`CSAT (${d.kpis.csat_count})`} value={d.kpis.csat > 0 ? d.kpis.csat.toFixed(2) : "—"} />
            <KpiCard label="Técnicos ativos" value={d.kpis.active_techs} />
          </section>

          {/* Main grid */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">
            {/* Open queue */}
            <Panel
              title="Fila em Aberto"
              className="xl:col-span-2"
              badge={<span className="text-sm text-muted-foreground">{d.open_queue.length} aguardando</span>}
            >
              <div className="overflow-auto h-full">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Chamado</th>
                      <th className="text-left px-3 py-2">Solicitante</th>
                      <th className="text-left px-3 py-2">Categoria</th>
                      <th className="text-left px-3 py-2">Prioridade</th>
                      <th className="text-right px-3 py-2">Aguardando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.open_queue.map(t => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2 max-w-xs truncate">{t.title}</td>
                        <td className="px-3 py-2">{t.requester}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.category}</td>
                        <td className="px-3 py-2">{t.priority}</td>
                        <td className={cn("px-3 py-2 text-right tabular-nums font-medium", slaColor(t.sla))}>{fmtMin(t.waiting_min)}</td>
                      </tr>
                    ))}
                    {d.open_queue.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem chamados em aberto 🎉</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Ranking + Preventivas stacked */}
            <div className="flex flex-col gap-4 min-h-0">
              <Panel title="Ranking do dia">
                <ul className="divide-y">
                  {d.ranking_today.map((r, i) => (
                    <li key={r.id} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center font-bold text-sm",
                          i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                          i === 1 ? "bg-gray-400/20 text-gray-300" :
                          i === 2 ? "bg-orange-500/20 text-orange-500" :
                          "bg-muted text-muted-foreground"
                        )}>{i + 1}</span>
                        <span className="font-medium truncate">{r.name}</span>
                      </div>
                      <span className="tabular-nums font-semibold">{r.fechados}</span>
                    </li>
                  ))}
                  {d.ranking_today.length === 0 && (
                    <li className="text-center py-6 text-muted-foreground text-sm">Nenhum atendimento fechado hoje</li>
                  )}
                </ul>
              </Panel>

              <Panel title="Preventivas do mês">
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="text-2xl font-bold tabular-nums">{d.preventivas_month.total}</div>
                    </div>
                    <div className="rounded-lg bg-[hsl(var(--status-closed-bg))] p-3">
                      <div className="text-xs text-muted-foreground">Feitas</div>
                      <div className="text-2xl font-bold tabular-nums text-[hsl(var(--status-closed))]">{d.preventivas_month.feitas}</div>
                    </div>
                    <div className="rounded-lg bg-[hsl(var(--status-waiting-bg))] p-3">
                      <div className="text-xs text-muted-foreground">Pendentes</div>
                      <div className="text-2xl font-bold tabular-nums text-[hsl(var(--status-waiting))]">{d.preventivas_month.pendentes}</div>
                    </div>
                    <div className="rounded-lg bg-[hsl(var(--status-open-bg))] p-3">
                      <div className="text-xs text-muted-foreground">Atrasadas</div>
                      <div className="text-2xl font-bold tabular-nums text-[hsl(var(--status-open))]">{d.preventivas_month.atrasadas}</div>
                    </div>
                  </div>
                  <div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--status-closed))] transition-all"
                        style={{ width: `${d.preventivas_month.total ? Math.min(100, (d.preventivas_month.feitas / d.preventivas_month.total) * 100) : 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {d.preventivas_month.total
                        ? `${Math.round((d.preventivas_month.feitas / d.preventivas_month.total) * 100)}% concluído`
                        : "Sem preventivas cadastradas"}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>

            {/* In progress */}
            <Panel
              title="Chamados em Andamento"
              className="xl:col-span-2"
              badge={<span className="text-sm text-muted-foreground">{d.in_progress_list.length} ativos</span>}
            >
              <div className="overflow-auto h-full">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Chamado</th>
                      <th className="text-left px-3 py-2">Técnico</th>
                      <th className="text-left px-3 py-2">Categoria</th>
                      <th className="text-right px-3 py-2">Decorrido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.in_progress_list.map(t => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2 max-w-xs truncate">{t.title}</td>
                        <td className="px-3 py-2">{t.technician}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.category}</td>
                        <td className={cn("px-3 py-2 text-right tabular-nums font-medium", slaColor(t.sla))}>{fmtMin(t.elapsed_min)}</td>
                      </tr>
                    ))}
                    {d.in_progress_list.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum atendimento em andamento</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* SLA alerts */}
            <Panel
              title="Alertas de SLA"
              badge={<span className="text-sm text-[hsl(var(--status-open))] font-semibold">{d.sla_alerts.length}</span>}
            >
              <ul className="divide-y overflow-auto h-full">
                {d.sla_alerts.map(a => (
                  <li key={a.id} className="px-3 py-2 flex items-center gap-2">
                    <span className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      a.sla === "crit" ? "bg-[hsl(var(--status-open))] animate-pulse" : "bg-[hsl(var(--status-waiting))]"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{a.title}</div>
                      <div className="text-[11px] text-muted-foreground">{a.priority} · {fmtMin(a.minutes)}</div>
                    </div>
                  </li>
                ))}
                {d.sla_alerts.length === 0 && (
                  <li className="text-center py-6 text-muted-foreground text-sm">Tudo dentro do prazo ✅</li>
                )}
              </ul>
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}
