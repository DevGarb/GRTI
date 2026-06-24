import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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
  const [checks, setChecks] = useState({
    doc_ok: false,
    evidence_ok: false,
    homolog_ok: false,
    backlog_ok: false,
    standards_ok: false,
  });

  const close = useMutation({
    mutationFn: async () => {
      if (!sprint) return;
      const { error } = await (supabase as any).rpc("close_sprint_with_checklist", {
        _sprint_id: sprint.id,
        _doc_ok: checks.doc_ok,
        _evidence_ok: checks.evidence_ok,
        _homolog_ok: checks.homolog_ok,
        _backlog_ok: checks.backlog_ok,
        _standards_ok: checks.standards_ok,
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
  const score = Object.values(checks).filter(Boolean).length * 20;

  const items = [
    { key: "doc_ok", label: "Documentação atualizada" },
    { key: "evidence_ok", label: "Evidências anexadas" },
    { key: "homolog_ok", label: "Homologação realizada" },
    { key: "backlog_ok", label: "Backlog atualizado" },
    { key: "standards_ok", label: "Conformidade com padrões técnicos" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar sprint — {sprint?.name}</DialogTitle>
          <DialogDescription>
            Marque cada item do checklist de qualidade (peso 20% cada). Todos precisam ser confirmados para encerrar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {items.map((it) => (
            <label key={it.key} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
              <Checkbox
                checked={(checks as any)[it.key]}
                onCheckedChange={(v) => setChecks((p) => ({ ...p, [it.key]: !!v }))}
              />
              <span className="text-sm">{it.label}</span>
            </label>
          ))}
        </div>
        <div className="text-sm">
          Qualidade técnica calculada: <strong>{score}%</strong>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => close.mutate()} disabled={!allChecked || close.isPending}>
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sprints</h1>
        <p className="text-sm text-muted-foreground">Acompanhe sprints, taxa de conclusão e qualidade.</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando sprints...</div>
      ) : sprints.length === 0 ? (
        <div className="card-elevated p-8 text-center text-sm text-muted-foreground">Nenhuma sprint cadastrada.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sprints.map((s) => {
            const concl = s.total_tasks > 0 ? Math.round((s.completed / s.total_tasks) * 100) : 0;
            const retrab = s.total_tasks > 0 ? Math.round((s.reworks / s.total_tasks) * 100) : 0;
            const efic = Math.round(concl * (1 - Math.min(retrab, 100) / 100));
            return (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{s.name}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{s.project_name}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        s.status === "ativa"
                          ? "bg-blue-500/15 text-blue-700"
                          : s.status === "concluida"
                            ? "bg-emerald-500/15 text-emerald-700"
                            : ""
                      }
                    >
                      {s.status}
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
                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={`/projetos/${s.project_id}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir projeto
                      </Link>
                    </Button>
                    {s.status !== "concluida" && (
                      <Button size="sm" onClick={() => setToClose(s)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Encerrar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CloseSprintDialog
        sprint={toClose}
        open={!!toClose}
        onOpenChange={(v) => !v && setToClose(null)}
      />
    </div>
  );
}
