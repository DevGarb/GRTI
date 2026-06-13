import { useState, useMemo } from "react";
import { Plus, Trash2, Target, Users, User, Edit2, Check, X, CheckCircle2, Clock, Star, Award, Wrench } from "lucide-react";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, type PerformanceGoal } from "@/hooks/useGoals";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const METRICS = [
  { value: "tickets_closed", label: "Chamados Fechados", short: "Fechados", unit: "", step: 1, icon: CheckCircle2 },
  { value: "avg_score", label: "Nota Média", short: "Nota", unit: "/5", step: 0.1, icon: Star },
  { value: "avg_resolution_hours", label: "Tempo Médio Resolução", short: "TMR", unit: "h", step: 1, icon: Clock },
  { value: "points", label: "Pontuação", short: "Pontos", unit: "pts", step: 1, icon: Award },
  { value: "preventivas_done", label: "Preventivas Realizadas", short: "Preventivas", unit: "", step: 1, icon: Wrench },
];

const MONTHS = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface Props {
  year: number;
  month: number;
}

type TargetForm = {
  target_type: "individual" | "sector";
  target_id: string;
  target_label: string;
  values: Record<string, string>; // metric -> string input
};

const emptyForm = (): TargetForm => ({
  target_type: "individual",
  target_id: "",
  target_label: "",
  values: {},
});

export default function GoalsManager({ year, month }: Props) {
  const { data: goals = [], isLoading } = useGoals(year, month);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [form, setForm] = useState<TargetForm>(emptyForm());

  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians-for-goals"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_organization_roles")
        .select("user_id")
        .in("role", ["tecnico", "desenvolvedor"]);
      if (!roles || roles.length === 0) return [];
      const ids = [...new Set(roles.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids)
        .order("full_name");
      return profiles || [];
    },
  });

  const openNew = () => {
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEditTarget = (g: PerformanceGoal[]) => {
    // Pre-fill form with existing values for a given target
    const first = g[0];
    const values: Record<string, string> = {};
    g.forEach((x) => { values[x.metric] = String(x.target_value); });
    setForm({
      target_type: first.target_type as "individual" | "sector",
      target_id: first.target_id,
      target_label: first.target_label,
      values,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.target_id) {
      toast.error("Selecione um técnico ou informe o setor");
      return;
    }
    const entries = Object.entries(form.values)
      .map(([metric, v]) => ({ metric, value: parseFloat(v) }))
      .filter((e) => !isNaN(e.value) && e.value > 0);

    if (entries.length === 0) {
      toast.error("Preencha pelo menos uma métrica");
      return;
    }

    setSaving(true);
    try {
      // Existing goals for this target in this period
      const existing = goals.filter(
        (g) => g.target_id === form.target_id && g.target_type === form.target_type
      );

      const ops = entries.map(async (e) => {
        const existingRow = existing.find((g) => g.metric === e.metric);
        if (existingRow) {
          const { error } = await supabase
            .from("performance_goals")
            .update({ target_value: e.value, updated_at: new Date().toISOString() })
            .eq("id", existingRow.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("performance_goals").insert({
            target_type: form.target_type,
            target_id: form.target_id,
            target_label: form.target_label,
            metric: e.metric,
            target_value: e.value,
            period: "monthly",
            reference_month: month,
            reference_year: year,
            created_by: user!.id,
          });
          if (error) throw error;
        }
      });

      await Promise.all(ops);
      qc.invalidateQueries({ queryKey: ["performance-goals"] });
      toast.success(`${entries.length} meta(s) salva(s) com sucesso!`);
      setShowForm(false);
      setForm(emptyForm());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao salvar: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = (id: string) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) return;
    updateGoal.mutate({ id, target_value: val });
    setEditingId(null);
  };

  const metricMeta = (m: string) => METRICS.find((x) => x.value === m);

  // Group by target
  const grouped = useMemo(() => {
    const indiv = new Map<string, PerformanceGoal[]>();
    const sect = new Map<string, PerformanceGoal[]>();
    for (const g of goals) {
      const map = g.target_type === "sector" ? sect : indiv;
      const arr = map.get(g.target_id) || [];
      arr.push(g);
      map.set(g.target_id, arr);
    }
    return {
      individual: Array.from(indiv.values()).sort((a, b) => a[0].target_label.localeCompare(b[0].target_label)),
      sector: Array.from(sect.values()).sort((a, b) => a[0].target_label.localeCompare(b[0].target_label)),
    };
  }, [goals]);

  const renderGroupCard = (groupGoals: PerformanceGoal[]) => {
    const first = groupGoals[0];
    return (
      <div key={first.target_id} className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {first.target_label.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground truncate">{first.target_label}</div>
              <div className="text-[11px] text-muted-foreground">{groupGoals.length} meta(s)</div>
            </div>
          </div>
          <button
            onClick={() => openEditTarget(groupGoals)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3 w-3" /> Editar metas
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
          {METRICS.map((m) => {
            const g = groupGoals.find((x) => x.metric === m.value);
            const Icon = m.icon;
            if (!g) {
              return (
                <div key={m.value} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border/50 text-muted-foreground/50">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs flex-1">{m.short}</span>
                  <span className="text-xs">—</span>
                </div>
              );
            }
            return (
              <div key={m.value} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/50 group">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground flex-1 truncate">{m.short}</span>
                {editingId === g.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-16 px-1.5 py-0.5 rounded border border-input bg-background text-xs text-foreground"
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(g.id)} className="text-emerald-500 hover:text-emerald-600"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-sm text-foreground">{g.target_value}{m.unit}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(g.id); setEditValue(String(g.target_value)); }} className="p-0.5 text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => deleteGoal.mutate(g.id)} className="p-0.5 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas — {MONTHS[month]} {year}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Defina todas as KPIs de um técnico ou setor de uma só vez</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Definir Metas
        </button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={form.target_type}
                onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value as "individual" | "sector", target_id: "", target_label: "" }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option value="individual">Individual (Técnico)</option>
                <option value="sector">Setor</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {form.target_type === "individual" ? "Técnico" : "Nome do Setor"}
              </label>
              {form.target_type === "individual" ? (
                <select
                  value={form.target_id}
                  onChange={(e) => {
                    const tech = technicians.find((t) => t.user_id === e.target.value);
                    setForm((f) => ({ ...f, target_id: e.target.value, target_label: tech?.full_name || "" }));
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
                >
                  <option value="">Selecionar técnico...</option>
                  {technicians.map((t) => (
                    <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.target_label}
                  onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value, target_label: e.target.value }))}
                  placeholder="Ex: TI, Infraestrutura, Suporte N1..."
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
                />
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              KPIs (preencha as métricas desejadas — deixe em branco para ignorar)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {METRICS.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.value} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/50">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <label className="text-xs text-foreground flex-1">{m.label}{m.unit && <span className="text-muted-foreground"> ({m.unit})</span>}</label>
                    <input
                      type="number"
                      min={0}
                      step={m.step}
                      value={form.values[m.value] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, values: { ...f.values, [m.value]: e.target.value } }))}
                      placeholder="—"
                      className="w-20 px-2 py-1 rounded border border-input bg-background text-sm text-foreground text-right"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm()); }}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar Metas"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center rounded-xl border border-border bg-card gap-2">
          <Target className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma meta definida para este período.</p>
          <p className="text-xs text-muted-foreground">Clique em "Definir Metas" para começar.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.individual.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                <User className="h-4 w-4 text-primary" /> Metas Individuais
                <span className="text-xs font-normal text-muted-foreground">({grouped.individual.length})</span>
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {grouped.individual.map(renderGroupCard)}
              </div>
            </div>
          )}
          {grouped.sector.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                <Users className="h-4 w-4 text-primary" /> Metas por Setor
                <span className="text-xs font-normal text-muted-foreground">({grouped.sector.length})</span>
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {grouped.sector.map(renderGroupCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
