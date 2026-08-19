import { useEffect, useMemo, useRef, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
import { useSprintClosureCategories } from "@/hooks/useSprintClosureCategories";

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
  const { profile } = useAuth();
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
  const [finishedBy, setFinishedBy] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const inputs = useRef<Record<CheckKey, HTMLInputElement | null>>({} as any);

  const { data: categories = [] } = useSprintClosureCategories(profile?.organization_id ?? null, { activeOnly: true });

  // Técnicos/desenvolvedores/admins da organização da sprint
  const { data: staff = [] } = useQuery({
    queryKey: ["sprint-close-staff", profile?.organization_id],
    enabled: !!open && !!profile?.organization_id,
    queryFn: async () => {
      const orgId = profile!.organization_id!;
      const { data: roles } = await supabase
        .from("user_organization_roles")
        .select("user_id, role")
        .eq("organization_id", orgId)
        .in("role", ["tecnico", "desenvolvedor", "admin"]);
      const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
      if (ids.length === 0) return [] as any[];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids)
        .order("full_name");
      return (profs || []) as any[];
    },
  });

  // Itens da sprint com autoria (tarefas + chamados) para dividir a pontuação
  const { data: split } = useQuery({
    queryKey: ["sprint-credit-split", sprint?.id],
    enabled: !!open && !!sprint?.id,
    queryFn: async () => {
      const [{ data: tasks }, { data: tks }] = await Promise.all([
        supabase
          .from("project_tasks")
          .select("story_points, credited_to, assignee_id")
          .eq("sprint_id", sprint!.id),
        supabase
          .from("tickets")
          .select("story_points, assigned_to")
          .eq("sprint_id", sprint!.id)
          .neq("type", "Projeto"),
      ]);
      const rows: { user_id: string | null; points: number }[] = [
        ...(tasks || []).map((t: any) => ({
          user_id: (t.credited_to || t.assignee_id || null) as string | null,
          points: t.story_points || 0,
        })),
        ...(tks || []).map((t: any) => ({
          user_id: (t.assigned_to || null) as string | null,
          points: t.story_points || 0,
        })),
      ];
      const byUser = new Map<string, { points: number; count: number }>();
      let unassignedPoints = 0;
      let unassignedCount = 0;
      for (const r of rows) {
        if (!r.user_id) {
          unassignedPoints += r.points;
          unassignedCount += 1;
          continue;
        }
        const cur = byUser.get(r.user_id) || { points: 0, count: 0 };
        byUser.set(r.user_id, { points: cur.points + r.points, count: cur.count + 1 });
      }
      const totalPoints = rows.reduce((s, r) => s + r.points, 0);
      return {
        totalPoints,
        unassignedPoints,
        unassignedCount,
        entries: Array.from(byUser.entries()).map(([user_id, v]) => ({ user_id, ...v })),
      };
    },
  });

  const totalPoints = split?.totalPoints ?? 0;

  // Pontos editáveis por pessoa
  const [credits, setCredits] = useState<Record<string, number>>({});
  const [splitKey, setSplitKey] = useState<string>("");

  useEffect(() => {
    if (!split || !sprint) return;
    const key = `${sprint.id}:${split.totalPoints}:${split.entries.length}`;
    if (key === splitKey) return;
    const base: Record<string, number> = {};
    split.entries.forEach((e) => (base[e.user_id] = e.points));
    if (split.unassignedPoints > 0 && finishedBy) {
      base[finishedBy] = (base[finishedBy] || 0) + split.unassignedPoints;
    }
    setCredits(base);
    setSplitKey(key);
  }, [split, sprint, finishedBy, splitKey]);

  useEffect(() => {
    if (!open) {
      setCredits({});
      setSplitKey("");
    }
  }, [open]);

  const staffName = (id: string) => {
    const s = staff.find((x: any) => x.user_id === id);
    return s?.full_name || s?.email || "Usuário";
  };

  const creditRows = useMemo(
    () =>
      Object.entries(credits).map(([user_id, points]) => ({
        user_id,
        points,
        count: split?.entries.find((e) => e.user_id === user_id)?.count ?? 0,
      })),
    [credits, split]
  );

  const creditSum = creditRows.reduce((s, r) => s + (Number(r.points) || 0), 0);
  const splitOk = creditRows.length === 0 ? false : creditSum === totalPoints;

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
        _finished_by: finishedBy,
        _category_id: categoryId || null,
        _evidences: evidencesPayload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-sprints"] });
      qc.invalidateQueries({ queryKey: ["sprints"] });
      qc.invalidateQueries({ queryKey: ["projetos-dashboard"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Sprint encerrada");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const allChecked = Object.values(checks).every(Boolean);
  const canClose = allChecked && !!finishedBy && !!categoryId;
  const score = Object.values(checks).filter(Boolean).length * 20;
  const selectedStaff = staff.find((s: any) => s.user_id === finishedBy);

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

        <div className="space-y-1.5">
          <Label className="text-xs">Técnico responsável pela entrega</Label>
          <Select value={finishedBy} onValueChange={setFinishedBy}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione o responsável..." />
            </SelectTrigger>
            <SelectContent>
              {staff.map((s: any) => (
                <SelectItem key={s.user_id} value={s.user_id}>
                  {s.full_name || s.email}
                </SelectItem>
              ))}
              {staff.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum técnico/admin nesta organização</div>
              )}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Este encerramento vai gerar 1 chamado para{" "}
            <strong>{selectedStaff ? selectedStaff.full_name || selectedStaff.email : "—"}</strong>{" "}
            com <strong>{totalPoints}</strong> {totalPoints === 1 ? "ponto" : "pontos"} (soma dos chamados + tarefas da sprint).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Categoria do encerramento</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione a categoria..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              {categories.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nenhuma categoria ativa. Cadastre em Projetos → Cat. Encerramento.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 py-1 max-h-[45vh] overflow-y-auto">
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
                        <span className="text-[10px] text-muted-foreground">Opcional</span>
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
              {!finishedBy
                ? "Selecione o responsável"
                : !categoryId
                  ? "Selecione a categoria"
                  : "Confirme todos os itens"}
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
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Agrupa as sprints por projeto
  const groups = (() => {
    const map = new Map<string, { id: string; name: string; items: SprintRow[] }>();
    sprints.forEach((s) => {
      if (!map.has(s.project_id)) map.set(s.project_id, { id: s.project_id, name: s.project_name, items: [] });
      map.get(s.project_id)!.items.push(s);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const visibleGroups = projectFilter === "all" ? groups : groups.filter((g) => g.id === projectFilter);

  const renderSprint = (s: SprintRow) => {
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
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sprints</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe burndown, velocidade, qualidade e fechamento das sprints, agrupadas por projeto.
          </p>
        </div>
        {groups.length > 1 && (
          <div className="space-y-1">
            <Label className="text-xs">Projeto</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-9 w-[260px]">
                <SelectValue placeholder="Todos os projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando sprints...</div>
      ) : sprints.length === 0 ? (
        <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
          Nenhuma sprint cadastrada.
        </div>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map((g) => {
            const collapsed = !!collapsedProjects[g.id];
            const active = g.items.filter((s) => s.status === "ativa").length;
            const done = g.items.filter(
              (s) => s.status === "concluida" || (s.total_tasks > 0 && s.completed >= s.total_tasks),
            ).length;
            return (
              <section key={g.id} className="rounded-xl border bg-card/40">
                <button
                  type="button"
                  onClick={() => setCollapsedProjects((p) => ({ ...p, [g.id]: !collapsed }))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`}
                    />
                    <h2 className="truncate font-semibold">{g.name}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="outline">{g.items.length} sprints</Badge>
                    {active > 0 && (
                      <Badge variant="outline" className="bg-blue-500/15 text-blue-700">
                        {active} ativa{active > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {done > 0 && (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700">
                        {done} concluída{done > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </button>
                {!collapsed && (
                  <div className="grid gap-3 border-t p-4 md:grid-cols-2 xl:grid-cols-3">
                    {g.items.map(renderSprint)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <CloseSprintDialog sprint={toClose} open={!!toClose} onOpenChange={(v) => !v && setToClose(null)} />
    </div>
  );
}

