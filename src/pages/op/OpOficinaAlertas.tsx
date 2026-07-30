import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Wrench, ShieldAlert, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServiceOrders, type ServiceOrder } from "@/hooks/useOficina";
import { useMechanics } from "@/hooks/useOficina";
import { useCompanies } from "@/hooks/useOperacional";
import { useAuth } from "@/contexts/AuthContext";
import { stageInfo, daysInWorkshop } from "@/lib/oficinaStages";
import OficinaNav from "./OficinaNav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Planos de ação sugeridos por motivo do acionamento. */
const PLAN_SUGGESTIONS: Record<string, string[]> = {
  "Falta de peça": [
    "Confirmar pedido com o setor de compras e registrar prazo de entrega",
    "Buscar peça em fornecedor alternativo / similar homologado",
    "Realocar mecânico para outra moto enquanto a peça não chega",
  ],
  "Peça errada / avariada": [
    "Registrar a divergência com foto e acionar troca junto ao fornecedor",
    "Solicitar reposição imediata e cobrar prazo de reenvio",
    "Reverter a etapa da OS até a chegada da peça correta",
  ],
  "Aguardando autorização do cliente": [
    "Contatar o cliente/associado com o orçamento detalhado",
    "Definir prazo limite de resposta e comunicar a empresa responsável",
    "Registrar a autorização por escrito antes de retomar o serviço",
  ],
  "Serviço externo / terceirizada": [
    "Confirmar data de coleta e devolução com a terceirizada",
    "Registrar o custo previsto e o responsável pelo acompanhamento",
    "Definir checkpoint diário até o retorno da moto",
  ],
  "Intercorrência técnica": [
    "Reavaliar o diagnóstico junto ao mecânico responsável",
    "Registrar novo escopo e revisar prazo de entrega",
    "Escalar para apoio técnico especializado se necessário",
  ],
  Outro: [
    "Alinhar com o mecânico o impedimento e definir responsável",
    "Definir prazo de retomada do serviço",
    "Comunicar o cliente sobre o novo prazo",
  ],
};

const SEV = (days: number) =>
  days >= 3
    ? { label: "Crítico", chip: "bg-rose-100 text-rose-700 border-rose-200", bar: "bg-rose-500" }
    : days >= 1
    ? { label: "Atenção", chip: "bg-amber-100 text-amber-800 border-amber-200", bar: "bg-amber-500" }
    : { label: "Novo", chip: "bg-sky-100 text-sky-700 border-sky-200", bar: "bg-sky-500" };

const hoursSince = (iso?: string | null) =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)) : 0;

export default function OpOficinaAlertas() {
  const { items, update, refetch } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();
  const { user } = useAuth();

  const [drafts, setDrafts] = useState<Record<string, { plan: string; due: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const mechName = (id: string | null) => mechanics.find(m => m.id === id)?.name || "Sem mecânico";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "Sem empresa";

  const alerts = useMemo(
    () =>
      items
        .filter(o => o.supervisor_alert)
        .sort((a, b) => String(a.supervisor_alert_at || "").localeCompare(String(b.supervisor_alert_at || ""))),
    [items],
  );

  const semPlano = alerts.filter(o => !o.supervisor_action_plan);
  const criticos = alerts.filter(o => hoursSince(o.supervisor_alert_at) >= 72);

  const draftOf = (o: ServiceOrder) =>
    drafts[o.id] || { plan: o.supervisor_action_plan || "", due: o.supervisor_action_due || "" };

  const setDraft = (id: string, patch: Partial<{ plan: string; due: string }>) =>
    setDrafts(d => ({ ...d, [id]: { ...(d[id] || { plan: "", due: "" }), ...patch } }));

  const savePlan = async (o: ServiceOrder) => {
    const d = draftOf(o);
    if (!d.plan.trim()) return toast.error("Descreva o plano de ação");
    setSavingId(o.id);
    try {
      await update(o.id, {
        supervisor_action_plan: d.plan.trim(),
        supervisor_action_due: d.due || null,
        supervisor_action_by: user?.id || null,
        supervisor_action_at: new Date().toISOString(),
      } as any);
      toast.success("Plano de ação registrado");
      refetch();
    } finally {
      setSavingId(null);
    }
  };

  const resolve = async (o: ServiceOrder) => {
    await update(o.id, {
      supervisor_alert: false,
      supervisor_alert_resolved_at: new Date().toISOString(),
    } as any);
    toast.success("Alerta resolvido");
    refetch();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <OficinaNav />
      <div className="max-w-[1100px] mx-auto p-4 md:p-6 space-y-4">
        <header className="bg-card border rounded-xl p-5 flex items-center gap-4 flex-wrap">
          <div className={cn("h-11 w-11 rounded-lg flex items-center justify-center", alerts.length ? "bg-rose-500/15" : "bg-emerald-500/15")}>
            <ShieldAlert className={cn("h-6 w-6", alerts.length ? "text-rose-600" : "text-emerald-600")} />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-lg font-bold">Alertas do Supervisor</h1>
            <p className="text-sm text-muted-foreground">
              Motos que não podem ser finalizadas agora. Registre o plano de ação e resolva o alerta.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-sm">{alerts.length} aberto(s)</Badge>
            <Badge variant="secondary" className="bg-amber-500/15 text-amber-700">{semPlano.length} sem plano</Badge>
            <Badge variant="secondary" className="bg-rose-500/15 text-rose-700">{criticos.length} há 3+ dias</Badge>
          </div>
        </header>

        {alerts.length === 0 && (
          <div className="bg-card border rounded-xl p-12 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
            <div className="font-medium">Nenhum alerta aberto</div>
            <p className="text-sm text-muted-foreground">
              Quando um mecânico acionar o supervisor, a moto aparece aqui automaticamente.
            </p>
          </div>
        )}

        {alerts.map(o => {
          const hrs = hoursSince(o.supervisor_alert_at);
          const sev = SEV(Math.floor(hrs / 24));
          const d = draftOf(o);
          const suggestions = PLAN_SUGGESTIONS[o.supervisor_alert_reason || "Outro"] || PLAN_SUGGESTIONS.Outro;
          return (
            <article key={o.id} className="bg-card border rounded-xl overflow-hidden flex">
              <div className={cn("w-1.5 shrink-0", sev.bar)} />
              <div className="flex-1 p-4 space-y-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold tracking-wide">{o.vehicle_plate || `OS #${o.os_number}`}</span>
                      <Badge variant="outline" className={sev.chip}>{sev.label}</Badge>
                      <Badge variant="secondary" className="bg-amber-500/15 text-amber-700">
                        <AlertTriangle className="h-3 w-3 mr-1" />{o.supervisor_alert_reason || "Acionamento"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {[o.vehicle_model, companyName(o.company_id), stageInfo(o.stage).label].filter(Boolean).join(" · ")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{mechName(o.mechanic_id)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                        aberto há {hrs < 24 ? `${hrs}h` : `${Math.floor(hrs / 24)}d`} · {daysInWorkshop(o.opened_at)}d na oficina
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => resolve(o)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Resolver alerta
                  </Button>
                </div>

                <div className="border-l-2 border-amber-400 bg-amber-500/10 rounded-r-md px-3 py-2">
                  <div className="text-xs font-medium text-amber-800 mb-0.5">Observação do mecânico</div>
                  <p className="text-sm text-amber-900/90 whitespace-pre-wrap">{o.supervisor_alert_note || "—"}</p>
                </div>

                <div className="border rounded-md p-3 space-y-3 bg-muted/20">
                  <div className="text-sm font-medium flex items-center gap-1">
                    <ListChecks className="h-4 w-4" /> Plano de ação
                    {o.supervisor_action_plan && (
                      <Badge variant="secondary" className="ml-1 bg-emerald-500/15 text-emerald-700">definido</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDraft(o.id, { plan: d.plan ? `${d.plan}\n- ${s}` : `- ${s}` })}
                        className="text-xs rounded-full border px-2.5 py-1 hover:bg-accent transition"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>

                  <Textarea
                    rows={3}
                    value={d.plan}
                    onChange={e => setDraft(o.id, { plan: e.target.value })}
                    placeholder="Descreva as ações, responsáveis e próximos passos"
                  />

                  <div className="flex items-end gap-3 flex-wrap">
                    <div>
                      <Label className="text-xs">Prazo previsto</Label>
                      <Input type="date" value={d.due} onChange={e => setDraft(o.id, { due: e.target.value })} className="w-44" />
                    </div>
                    <Button size="sm" onClick={() => savePlan(o)} disabled={savingId === o.id}>
                      {savingId === o.id ? "Salvando..." : "Salvar plano"}
                    </Button>
                    {o.supervisor_action_at && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Atualizado em {new Date(o.supervisor_action_at).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
