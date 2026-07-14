import { useMemo, useState } from "react";
import { Wrench, Laptop, Monitor, Printer, Server, Users, AlertTriangle, Clock, Check } from "lucide-react";
import { useOverdueEquipment } from "@/hooks/usePreventivas";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  year: number;
  /** 1-12 */
  month: number;
}

const MONTHS = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const TYPES = [
  { key: "Notebook", icon: Laptop },
  { key: "Desktop", icon: Monitor },
  { key: "Impressora", icon: Printer },
  { key: "Servidor", icon: Server },
] as const;

type Bucket = { overdue: number; dueInMonth: number };

export default function PreventivasMonthlyTarget({ year, month }: Props) {
  const { data: equipment = [], isLoading } = useOverdueEquipment();
  const { user, profile } = useAuth();
  const orgId = profile?.organization_id;
  const qc = useQueryClient();

  const [divideBy, setDivideBy] = useState(2);
  const [showApply, setShowApply] = useState(false);
  const [selectedTechs, setSelectedTechs] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const now = new Date();
  const isCurrentOrFuture =
    year > now.getFullYear() || (year === now.getFullYear() && month - 1 >= now.getMonth());

  const buckets = useMemo(() => {
    const map: Record<string, Bucket> = {};
    for (const t of TYPES) map[t.key] = { overdue: 0, dueInMonth: 0 };

    for (const eq of equipment) {
      if (!map[eq.equipment_type]) map[eq.equipment_type] = { overdue: 0, dueInMonth: 0 };
      const last = new Date(eq.last_date);
      const nextDue = new Date(last.getTime() + eq.interval_days * 24 * 60 * 60 * 1000);
      const inSelected = nextDue.getFullYear() === year && nextDue.getMonth() === month - 1;

      if (eq.status === "overdue" && isCurrentOrFuture) {
        map[eq.equipment_type].overdue++;
      } else if (inSelected) {
        map[eq.equipment_type].dueInMonth++;
      }
    }
    return map;
  }, [equipment, year, month, isCurrentOrFuture]);

  const totals = useMemo(() => {
    let total = 0;
    let overdue = 0;
    let dueInMonth = 0;
    for (const k of Object.keys(buckets)) {
      total += buckets[k].overdue + buckets[k].dueInMonth;
      overdue += buckets[k].overdue;
      dueInMonth += buckets[k].dueInMonth;
    }
    return { total, overdue, dueInMonth };
  }, [buckets]);

  const perTechByType = useMemo(() => {
    const n = Math.max(divideBy, 1);
    const result: Record<string, { per: number; leftover: number; total: number }> = {};
    for (const t of TYPES) {
      const total = buckets[t.key].overdue + buckets[t.key].dueInMonth;
      const per = Math.ceil(total / n);
      const leftover = per * n - total;
      result[t.key] = { per, leftover, total };
    }
    return result;
  }, [buckets, divideBy]);

  const suggestedTotalPerTech = Math.ceil(totals.total / Math.max(divideBy, 1));

  // Technicians for apply dialog
  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians-for-prev-target", orgId],
    enabled: showApply && !!orgId,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_organization_roles")
        .select("user_id, role")
        .eq("organization_id", orgId!)
        .in("role", ["tecnico", "desenvolvedor"]);
      const ids = [...new Set((roles || []).map((r) => r.user_id))];
      if (ids.length === 0) return [] as Array<{ user_id: string; full_name: string }>;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids)
        .eq("organization_id", orgId!)
        .order("full_name");
      return profiles || [];
    },
  });


  const openApply = () => {
    setSelectedTechs(new Set());
    setShowApply(true);
  };

  const toggleTech = (id: string) => {
    setSelectedTechs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    if (selectedTechs.size === 0) {
      toast.error("Selecione ao menos um técnico");
      return;
    }
    const targetValue = Math.ceil(totals.total / selectedTechs.size);
    if (targetValue <= 0) {
      toast.error("Nada a aplicar — não há preventivas previstas para este mês");
      return;
    }

    setApplying(true);
    try {
      const techList = technicians.filter((t) => selectedTechs.has(t.user_id));

      // Get existing preventivas_done goals for these techs in this period
      const { data: existing } = await supabase
        .from("performance_goals")
        .select("id, target_id")
        .eq("metric", "preventivas_done")
        .eq("reference_month", month)
        .eq("reference_year", year)
        .eq("target_type", "individual")
        .in("target_id", techList.map((t) => t.user_id));

      const existingMap = new Map((existing || []).map((e) => [e.target_id, e.id]));

      await Promise.all(
        techList.map(async (t) => {
          const id = existingMap.get(t.user_id);
          if (id) {
            const { error } = await supabase
              .from("performance_goals")
              .update({ target_value: targetValue, updated_at: new Date().toISOString() })
              .eq("id", id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("performance_goals").insert({
              target_type: "individual",
              target_id: t.user_id,
              target_label: t.full_name,
              metric: "preventivas_done",
              target_value: targetValue,
              period: "monthly",
              reference_month: month,
              reference_year: year,
              created_by: user!.id,
            });
            if (error) throw error;
          }
        })
      );

      qc.invalidateQueries({ queryKey: ["performance-goals"] });
      toast.success(`Meta de ${targetValue} preventivas aplicada para ${techList.length} técnico(s)`);
      setShowApply(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao aplicar meta: " + msg);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Preventivas a executar — {MONTHS[month]}/{year}</h3>
            <p className="text-xs text-muted-foreground">
              Use estes números para dividir entre os técnicos e definir a meta de "Preventivas Realizadas".
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" /> {totals.overdue} vencidas
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" /> {totals.dueInMonth} a vencer
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold">
            Total: {totals.total}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando equipamentos...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TYPES.map((t) => {
                const b = buckets[t.key];
                const total = b.overdue + b.dueInMonth;
                const Icon = t.icon;
                const dim = total === 0;
                return (
                  <div
                    key={t.key}
                    className={`p-3 rounded-lg border ${dim ? "border-dashed border-border/50 bg-muted/20" : "border-border bg-background"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${dim ? "text-muted-foreground/50" : "text-primary"}`} />
                      <span className={`text-xs font-medium ${dim ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{t.key}</span>
                    </div>
                    <div className={`text-2xl font-bold ${dim ? "text-muted-foreground/40" : "text-foreground"}`}>{total}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex gap-2 flex-wrap">
                      {b.overdue > 0 && <span className="text-red-600 dark:text-red-400">{b.overdue} venc.</span>}
                      {b.dueInMonth > 0 && <span className="text-amber-600 dark:text-amber-400">{b.dueInMonth} a venc.</span>}
                      {total === 0 && <span>—</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">Dividir entre</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={divideBy}
                    onChange={(e) => setDivideBy(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 px-2 py-1 rounded border border-input bg-background text-sm text-foreground text-center"
                  />
                  <span className="text-xs text-muted-foreground">técnico(s)</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Meta sugerida: <span className="font-semibold text-foreground">{suggestedTotalPerTech}</span> preventivas/téc
                </div>
                <button
                  onClick={openApply}
                  disabled={totals.total === 0}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="h-3.5 w-3.5" />
                  Aplicar como meta
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                {TYPES.map((t) => {
                  const s = perTechByType[t.key];
                  if (s.total === 0) return (
                    <div key={t.key} className="text-[11px] text-muted-foreground/60 px-2 py-1">
                      {t.key}: —
                    </div>
                  );
                  return (
                    <div key={t.key} className="text-[11px] text-muted-foreground px-2 py-1">
                      <span className="font-semibold text-foreground">{t.key}:</span> {s.per}/téc
                      {s.leftover > 0 && <span className="text-amber-600 dark:text-amber-400"> ({s.leftover} sobrando)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {showApply && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !applying && setShowApply(false)}
        >
          <div
            className="bg-card rounded-xl border border-border max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border">
              <h4 className="font-semibold text-foreground">Aplicar meta de preventivas</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione os técnicos que vão dividir as <span className="font-semibold text-foreground">{totals.total}</span> preventivas de {MONTHS[month]}/{year}.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {technicians.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">Nenhum técnico encontrado.</div>
              ) : (
                technicians.map((t) => (
                  <label
                    key={t.user_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTechs.has(t.user_id)}
                      onChange={() => toggleTech(t.user_id)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-foreground">{t.full_name}</span>
                  </label>
                ))
              )}
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {selectedTechs.size > 0 ? (
                  <>
                    Meta por técnico: <span className="font-semibold text-foreground">{Math.ceil(totals.total / selectedTechs.size)}</span>
                  </>
                ) : (
                  "Selecione ao menos um técnico"
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApply(false)}
                  disabled={applying}
                  className="px-3 py-1.5 rounded-md border border-input text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying || selectedTechs.size === 0}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-40"
                >
                  {applying ? "Aplicando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
