import { useState } from "react";
import { Plus, Trash2, Target, Users, User, Edit2, Check, X } from "lucide-react";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, type CreateGoalInput } from "@/hooks/useGoals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const METRICS = [
  { value: "tickets_closed", label: "Chamados Fechados", unit: "" },
  { value: "avg_score", label: "Nota Média", unit: "/5" },
  { value: "avg_resolution_hours", label: "Tempo Médio Resolução (h)", unit: "h" },
  { value: "points", label: "Pontuação", unit: "pts" },
  { value: "preventivas_done", label: "Preventivas Realizadas", unit: "" },
];

const MONTHS = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface Props {
  year: number;
  month: number;
}

export default function GoalsManager({ year, month }: Props) {
  const { data: goals = [], isLoading } = useGoals(year, month);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [form, setForm] = useState<CreateGoalInput>({
    target_type: "individual",
    target_id: "",
    target_label: "",
    metric: "tickets_closed",
    target_value: 0,
    period: "monthly",
    reference_month: month,
    reference_year: year,
  });

  // Fetch technicians for dropdown
  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians-for-goals"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["tecnico", "admin"]);
      if (!roles || roles.length === 0) return [];
      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      return profiles || [];
    },
  });

  const handleSubmit = () => {
    if (!form.target_id || form.target_value <= 0) return;
    createGoal.mutate(form, {
      onSuccess: () => {
        setShowForm(false);
        setForm((f) => ({ ...f, target_id: "", target_label: "", target_value: 0 }));
      },
    });
  };

  const handleStartEdit = (id: string, currentValue: number) => {
    setEditingId(id);
    setEditValue(String(currentValue));
  };

  const handleSaveEdit = (id: string) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) return;
    updateGoal.mutate({ id, target_value: val });
    setEditingId(null);
  };

  const metricLabel = (m: string) => METRICS.find((x) => x.value === m)?.label || m;
  const metricUnit = (m: string) => METRICS.find((x) => x.value === m)?.unit || "";

  const individualGoals = goals.filter((g) => g.target_type === "individual");
  const sectorGoals = goals.filter((g) => g.target_type === "sector");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas — {MONTHS[month]} {year}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Defina metas manuais para técnicos e setores</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Nova Meta
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="p-5 rounded-xl border border-border bg-card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                value={form.target_type}
                onChange={(e) => setForm((f) => ({ ...f, target_type: e.target.value, target_id: "", target_label: "" }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option value="individual">Individual (Técnico)</option>
                <option value="sector">Setor</option>
              </select>
            </div>

            {/* Target */}
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

            {/* Metric */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Métrica</label>
              <select
                value={form.metric}
                onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                {METRICS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor da Meta</label>
              <input
                type="number"
                min={0}
                step={form.metric === "avg_score" ? 0.1 : 1}
                value={form.target_value || ""}
                onChange={(e) => setForm((f) => ({ ...f, target_value: parseFloat(e.target.value) || 0 }))}
                placeholder="Ex: 50"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.target_id || form.target_value <= 0 || createGoal.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {createGoal.isPending ? "Salvando..." : "Salvar Meta"}
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
          <p className="text-xs text-muted-foreground">Clique em "Nova Meta" para começar.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Individual goals */}
          {individualGoals.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                <User className="h-4 w-4 text-primary" /> Metas Individuais
              </h4>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Técnico</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Métrica</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Meta</th>
                      <th className="w-20 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {individualGoals.map((g) => (
                      <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{g.target_label}</td>
                        <td className="px-4 py-3 text-muted-foreground">{metricLabel(g.metric)}</td>
                        <td className="px-4 py-3">
                          {editingId === g.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 px-2 py-1 rounded border border-input bg-background text-sm text-foreground"
                                autoFocus
                              />
                              <button onClick={() => handleSaveEdit(g.id)} className="text-emerald-500 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                            </div>
                          ) : (
                            <span className="font-bold text-foreground">
                              {g.target_value}{metricUnit(g.metric)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleStartEdit(g.id, g.target_value)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteGoal.mutate(g.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sector goals */}
          {sectorGoals.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                <Users className="h-4 w-4 text-primary" /> Metas por Setor
              </h4>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Setor</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Métrica</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Meta</th>
                      <th className="w-20 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sectorGoals.map((g) => (
                      <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{g.target_label}</td>
                        <td className="px-4 py-3 text-muted-foreground">{metricLabel(g.metric)}</td>
                        <td className="px-4 py-3">
                          {editingId === g.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 px-2 py-1 rounded border border-input bg-background text-sm text-foreground"
                                autoFocus
                              />
                              <button onClick={() => handleSaveEdit(g.id)} className="text-emerald-500 hover:text-emerald-600"><Check className="h-4 w-4" /></button>
                              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                            </div>
                          ) : (
                            <span className="font-bold text-foreground">
                              {g.target_value}{metricUnit(g.metric)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleStartEdit(g.id, g.target_value)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteGoal.mutate(g.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
