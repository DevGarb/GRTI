import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Paperclip,
  ChevronDown,
  AlertTriangle,
  BarChart3,
  X,
} from "lucide-react";
import { toast } from "sonner";
import SprintMetricsPanel from "@/components/projetos/SprintMetricsPanel";

interface SprintRow {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  closed_at: string | null;
  quality_score: number | null;
  project_id: string;
  project_name: string;
  total_tasks: number;
  completed: number;
  reworks: number;
}

function useAllSprints() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["all-sprints", orgId],
    queryFn: async () => {
      let q = supabase.from("sprints").select("*").order("created_at", { ascending: false });
      if (orgId) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      const sprints = (data || []) as any[];
      if (sprints.length === 0) return [] as SprintRow[];
      const ids = sprints.map((s) => s.id);
      const projectIds = [...new Set(sprints.map((s) => s.project_id))];
      const [{ data: tasks }, { data: projs }] = await Promise.all([
        supabase.from("project_tasks").select("sprint_id, status, rework_count").in("sprint_id", ids),
        supabase.from("projects").select("id, name").in("id", projectIds),
      ]);
      const projMap = new Map((projs || []).map((p: any) => [p.id, p.name]));
      return sprints.map<SprintRow>((s) => {
        const t = (tasks || []).filter((x: any) => x.sprint_id === s.id);
        const done = t.filter((x: any) => x.status === "Concluído").length;
        const reworks = t.reduce((sum: number, x: any) => sum + (x.rework_count || 0), 0);
        return {
          id: s.id,
          name: s.name,
          status: s.status,
          start_date: s.start_date,
          end_date: s.end_date,
          closed_at: s.closed_at,
          quality_score: s.quality_score,
          project_id: s.project_id,
          project_name: projMap.get(s.project_id) || "—",
          total_tasks: t.length,
          completed: done,
          reworks,
        };
      });
    },
  });
}

type CheckKey = "doc_ok" | "evidence_ok" | "homolog_ok" | "backlog_ok" | "standards_ok";

const CHECKLIST: { key: CheckKey; label: string; hint: string }[] = [
  { key: "doc_ok", label: "Documentação atualizada", hint: "Wiki, README, changelog" },
  { key: "evidence_ok", label: "Evidências de testes anexadas", hint: "Prints, vídeos, logs" },
  { key: "homolog_ok", label: "Homologação realizada", hint: "Aprovação do PO/cliente" },
  { key: "backlog_ok", label: "Backlog atualizado", hint: "Tarefas e status revisados" },
  { key: "standards_ok", label: "Conformidade com padrões técnicos", hint: "Code review, lint, padrões" },
];

function CloseSprintDialog({
  sprint,
  open,
  onOpenChange,
}: {
  sprint: SprintRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    doc_ok: false,
    evidence_ok: false,
    homolog_ok: false,
    backlog_ok: false,
    standards_ok: false,
  });
  const [evidences, setEvidences] = useState<Record<CheckKey, { url: string; name: string } | null>>({
    doc_ok: null,
    evidence_ok: null,
    homolog_ok: null,
    backlog_ok: null,
    standards_ok: null,
  });
  const [uploading, setUploading] = useState<CheckKey | null>(null);
  const inputs = useRef<Record<CheckKey, HTMLInputElement | null>>({} as any);

  const handleUpload = async (key: CheckKey, file: File) => {
    if (!sprint) return;
    setUploading(key);
    try {
      const path = `sprint-quality/${sprint.id}/${key}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error } = await supabase.storage
        .from("attachments")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(data.path);
      setEvidences((p) => ({ ...p, [key]: { url: urlData.publicUrl, name: file.name } }));
    } catch (e: any) {
      toast.error("Erro no upload: " + e.message);
    } finally {
      setUploading(null);
    }
  };

  const close = useMutation({
    mutationFn: async () => {
      if (!sprint) return;
      const evidencesPayload: Record<string, string> = {};
      (Object.keys(evidences) as CheckKey[]).forEach((k) => {
        if (evidences[k]) evidencesPayload[k] = evidences[k]!.url;
      });
      const { error } = await (supabase as any).rpc("close_sprint_with_checklist", {
        _sprint_id: sprint.id,
        _doc_ok: checks.doc_ok,
        _evidence_ok: checks.evidence_ok,
        _homolog_ok: checks.homolog_ok,
        _backlog_ok: checks.backlog_ok,
        _standards_ok: checks.standards_ok,
        _evidences: evidencesPayload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-sprints"] });
      qc.invalidateQueries({ queryKey: ["sprints"] });
      qc.invalidateQueries({ queryKey: ["projetos-dashboard"] });
      toast.success("Sprint encerrada");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const allChecked = Object.values(checks).every(Boolean);
  const allEvidenced = (Object.keys(checks) as CheckKey[]).every((k) => !!evidences[k]);
  const canClose = allChecked && allEvidenced;
  const score = Object.values(checks).filter(Boolean).length * 20;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Encerrar sprint — {sprint?.name}</DialogTitle>
          <DialogDescription>
            Confirme cada item (peso 20%). As evidências são <strong>opcionais</strong>, mas recomendadas para
            rastreabilidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1 max-h-[50vh] overflow-y-auto">
          {CHECKLIST.map((it) => {
            const ev = evidences[it.key];
            const checked = checks[it.key];
            const ok = checked;
            return (
              <div
                key={it.key}
                className={`rounded-md border p-2.5 transition-colors ${
                  ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    className="mt-0.5"
                    checked={checked}
                    onCheckedChange={(v) => setChecks((p) => ({ ...p, [it.key]: !!v }))}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{it.label}</div>
                    <div className="text-[11px] text-muted-foreground">{it.hint}</div>

                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        ref={(el) => (inputs.current[it.key] = el)}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(it.key, f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] gap-1"
                        disabled={uploading === it.key}
                        onClick={() => inputs.current[it.key]?.click()}
                      >
                        <Paperclip className="h-3 w-3" />
                        {uploading === it.key ? "Enviando..." : ev ? "Substituir" : "Anexar evidência"}
                      </Button>
                      {ev ? (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-700 max-w-[220px]">
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate underline"
                            title={ev.name}
                          >
                            {ev.name}
                          </a>
                          <button
                            type="button"
                            onClick={() => setEvidences((p) => ({ ...p, [it.key]: null }))}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-600">Obrigatório</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            Qualidade técnica: <strong>{score}%</strong>
          </div>
          {!canClose && (
            <div className="flex items-center gap-1 text-[11px] text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              {!allChecked
                ? "Confirme todos os itens"
                : "Anexe a evidência de todos os itens"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => close.mutate()} disabled={!canClose || close.isPending}>
            Encerrar sprint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjetosSprints() {
  const { data: sprints = [], isLoading } = useAllSprints();
  const [toClose, setToClose] = useState<SprintRow | null>(null);
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sprints</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe burndown, velocidade, qualidade e fechamento das sprints.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando sprints...</div>
      ) : sprints.length === 0 ? (
        <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
          Nenhuma sprint cadastrada.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sprints.map((s) => {
            const concl = s.total_tasks > 0 ? Math.round((s.completed / s.total_tasks) * 100) : 0;
            const retrab = s.total_tasks > 0 ? Math.round((s.reworks / s.total_tasks) * 100) : 0;
            const efic = Math.round(concl * (1 - Math.min(retrab, 100) / 100));
            const open = !!expandedMetrics[s.id];
            // Mesma regra usada no Visão Geral do projeto
            const fullyDone = s.total_tasks > 0 && concl >= 100;
            const isOfficial = s.status === "concluida";
            const effectiveDone = isOfficial || fullyDone;
            const badgeLabel = isOfficial
              ? "concluida"
              : fullyDone
                ? "concluída (100%)"
                : s.status;
            const badgeClass = effectiveDone
              ? "bg-emerald-500/15 text-emerald-700"
              : s.status === "ativa"
                ? "bg-blue-500/15 text-blue-700"
                : "";
            return (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{s.name}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{s.project_name}</p>
                    </div>
                    <Badge variant="outline" className={badgeClass}>
                      {badgeLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Tarefas</p>
                      <p className="font-semibold">{s.total_tasks}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Concluídas</p>
                      <p className="font-semibold text-emerald-600">{s.completed}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Retrabalhos</p>
                      <p className="font-semibold text-red-600">{s.reworks}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-1.5 rounded bg-muted/50">
                      Conclusão<br /><strong>{concl}%</strong>
                    </div>
                    <div className="p-1.5 rounded bg-muted/50">
                      Retrabalho<br /><strong>{retrab}%</strong>
                    </div>
                    <div className="p-1.5 rounded bg-muted/50">
                      Eficiência<br /><strong>{efic}%</strong>
                    </div>
                  </div>
                  {s.quality_score != null && (
                    <div className="text-xs flex items-center gap-1 text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" /> Qualidade técnica: <strong>{s.quality_score}%</strong>
                    </div>
                  )}

                  <Collapsible
                    open={open}
                    onOpenChange={(v) => setExpandedMetrics((p) => ({ ...p, [s.id]: v }))}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5" /> Burndown e velocidade
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pt-2 border-t mt-1">
                        <SprintMetricsPanel sprintId={s.id} projectId={s.project_id} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={`/projetos/${s.project_id}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir projeto
                      </Link>
                    </Button>
                    {!isOfficial && (
                      <Button
                        size="sm"
                        onClick={() => setToClose(s)}
                        className={fullyDone ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        {fullyDone ? "Oficializar encerramento" : "Encerrar"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CloseSprintDialog sprint={toClose} open={!!toClose} onOpenChange={(v) => !v && setToClose(null)} />
    </div>
  );
}
