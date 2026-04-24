import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  useAvailableTickets,
  useLinkTicketsToProject,
  ProjectTicket,
} from "@/hooks/useProjectTickets";
import { useSprints } from "@/hooks/useSprints";
import { useProject } from "@/hooks/useProjects";
import {
  useTechnicianCapacity,
  useTechnicianLoadInSprint,
} from "@/hooks/useTechnicianCapacity";
import {
  pickDefaultSprint,
  sortByUrgency,
  slaBucket,
  suggestForSprint,
  simulateImpact,
} from "@/lib/sprintPlanning";
import SprintImpactPanel from "./SprintImpactPanel";
import { Search, Sparkles, AlertTriangle, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  defaultSprintId?: string | null;
}

const PRIORITIES = ["Crítica", "Alta", "Média", "Baixa"];

export default function AddTicketsToSprintModal({
  open,
  onOpenChange,
  projectId,
  defaultSprintId,
}: Props) {
  const { data: tickets = [], isLoading } = useAvailableTickets();
  const { data: sprints = [] } = useSprints(projectId);
  const { data: project } = useProject(projectId);
  const { data: techCaps = [] } = useTechnicianCapacity(projectId);
  const linkMut = useLinkTicketsToProject();

  const [search, setSearch] = useState("");
  const [priorities, setPriorities] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [points, setPoints] = useState<Record<string, number>>({});
  const [sprintId, setSprintId] = useState<string>("backlog");
  const [showPoints, setShowPoints] = useState(false);
  const [sortMode, setSortMode] = useState<"urgency" | "recent" | "priority">("urgency");
  const [suggestionReasons, setSuggestionReasons] = useState<Record<string, string>>({});

  const { data: sprintLoad = {} } = useTechnicianLoadInSprint(
    sprintId !== "backlog" ? sprintId : null
  );

  const technicianCapacityMap = useMemo(
    () => Object.fromEntries(techCaps.map((c) => [c.user_id, c.points_per_sprint])),
    [techCaps]
  );

  // ---------- defaults ao abrir ----------
  useEffect(() => {
    if (!open) return;
    setSelected({});
    setPoints({});
    setSearch("");
    setPriorities(new Set());
    setSuggestionReasons({});
    setSortMode("urgency");

    // destino inteligente
    if (defaultSprintId) {
      setSprintId(defaultSprintId);
    } else {
      const pick = pickDefaultSprint(sprints);
      setSprintId(pick ? pick.id : "backlog");
    }
  }, [open, defaultSprintId, sprints]);

  // ---------- lista filtrada/ordenada ----------
  const filtered = useMemo(() => {
    let list = tickets.filter((t) => {
      if (priorities.size > 0 && !priorities.has(t.priority)) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (
          !t.title.toLowerCase().includes(s) &&
          !(t.assignedName || "").toLowerCase().includes(s) &&
          !t.id.includes(s)
        )
          return false;
      }
      return true;
    });

    if (sortMode === "urgency") list = sortByUrgency(list);
    else if (sortMode === "priority") {
      const w: Record<string, number> = { Crítica: 4, Alta: 3, Média: 2, Baixa: 1 };
      list = [...list].sort((a, b) => (w[b.priority] || 0) - (w[a.priority] || 0));
    }
    return list;
  }, [tickets, priorities, search, sortMode]);

  function toggle(t: ProjectTicket) {
    setSelected((prev) => ({ ...prev, [t.id]: !prev[t.id] }));
    setPoints((prev) =>
      prev[t.id] !== undefined ? prev : { ...prev, [t.id]: t.categoryScore ?? 1 }
    );
  }

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const selectedTickets = filtered.filter((t) => selected[t.id]).concat(
    tickets.filter((t) => selected[t.id] && !filtered.find((f) => f.id === t.id))
  );

  const targetSprint = sprints.find((s) => s.id === sprintId);

  const impact = useMemo(() => {
    if (!targetSprint) {
      return {
        selectedCount: selectedTickets.length,
        selectedPoints: selectedTickets.reduce(
          (s, t) => s + (points[t.id] ?? t.story_points ?? 1),
          0
        ),
        totalAfter: 0,
        capacity: 0,
        exceedsBy: 0,
        byPriority: {},
        byAssignee: [],
      };
    }
    return simulateImpact({
      sprint: {
        id: targetSprint.id,
        name: targetSprint.name,
        status: targetSprint.status,
        capacity_points: targetSprint.capacity_points,
        totalPoints: targetSprint.totalPoints,
      },
      selectedTickets,
      pointsByTicket: points,
      technicianLoadCurrent: sprintLoad,
      technicianCapacity: technicianCapacityMap,
    });
  }, [targetSprint, selectedTickets, points, sprintLoad, technicianCapacityMap]);

  const willExceed = impact.exceedsBy > 0;
  const willBlock = willExceed && project?.enforce_capacity;

  const activeSprintExists = sprints.some((s) => s.status === "ativa");
  const showBacklogWarning = sprintId === "backlog" && activeSprintExists;

  // ---------- sugestão ----------
  function applySuggestion() {
    if (!targetSprint) return;
    const result = suggestForSprint(
      tickets,
      {
        id: targetSprint.id,
        name: targetSprint.name,
        status: targetSprint.status,
        capacity_points: targetSprint.capacity_points,
        totalPoints: targetSprint.totalPoints,
      },
      {
        maxCriticalPerSprint: project?.max_critical_per_sprint ?? 5,
        maxTicketsPerAssignee: 3,
        technicianCapacity: technicianCapacityMap,
        enforceTechnicianCapacity: project?.enforce_technician_capacity ?? false,
      }
    );
    const sel: Record<string, boolean> = {};
    const pts: Record<string, number> = { ...points };
    result.selectedIds.forEach((id) => {
      sel[id] = true;
      const t = tickets.find((x) => x.id === id);
      if (t && pts[id] === undefined) pts[id] = t.categoryScore ?? t.story_points ?? 1;
    });
    setSelected(sel);
    setPoints(pts);
    setSuggestionReasons(result.reasonByTicket);
  }

  async function submit() {
    if (selectedIds.length === 0) return;
    if (willBlock) return;
    try {
      await linkMut.mutateAsync({
        ticketIds: selectedIds,
        projectId,
        sprintId: sprintId === "backlog" ? null : sprintId,
        pointsByTicket: points,
      });
      onOpenChange(false);
    } catch {
      // toast mostrado pelo hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar chamados ao projeto</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Destino */}
          <div className="flex flex-wrap items-center gap-2">
            <Label className="whitespace-nowrap text-xs">Destino:</Label>
            <Select value={sprintId} onValueChange={setSprintId}>
              <SelectTrigger className="flex-1 min-w-[200px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Deixar para depois (sem sprint)</SelectItem>
                {sprints
                  .filter((s) => s.status !== "fechada" && s.status !== "cancelada")
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.totalPoints}/{s.capacity_points || "∞"} pts
                      {s.status === "ativa" && " • ATIVA"}
                      {s.status === "concluida" && " • concluída"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {targetSprint && (
              <Button
                size="sm"
                variant="outline"
                onClick={applySuggestion}
                title="Sugere chamados que cabem na capacidade ordenados por urgência"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Sugerir
              </Button>
            )}
          </div>

          {showBacklogWarning && (
            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Existe uma sprint <strong>ativa</strong>. Tem certeza que quer deixar sem sprint? Os
                chamados ficarão parados em "Não planejados" até serem movidos.
              </span>
            </div>
          )}

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, técnico ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setSortMode((m) => (m === "urgency" ? "recent" : m === "recent" ? "priority" : "urgency"))
              }
              title="Alternar ordenação"
            >
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              {sortMode === "urgency" ? "Urgência" : sortMode === "recent" ? "Mais recentes" : "Prioridade"}
            </Button>
            <div className="flex items-center gap-2">
              <Switch id="show-pts" checked={showPoints} onCheckedChange={setShowPoints} />
              <Label htmlFor="show-pts" className="text-xs cursor-pointer">
                Editar pontos
              </Label>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {PRIORITIES.map((p) => {
              const active = priorities.has(p);
              return (
                <Button
                  key={p}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => {
                    setPriorities((prev) => {
                      const next = new Set(prev);
                      if (next.has(p)) next.delete(p);
                      else next.add(p);
                      return next;
                    });
                  }}
                >
                  {p}
                </Button>
              );
            })}
          </div>

          {/* Lista */}
          <div className="border rounded-md flex-1 overflow-y-auto min-h-[200px]">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando chamados...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum chamado disponível.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-left">Chamado</th>
                    <th className="p-2 text-left w-24">Prioridade</th>
                    <th className="p-2 text-left w-32">Técnico</th>
                    {showPoints && <th className="p-2 text-left w-16">Pts</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const bucket = slaBucket(t);
                    const isSel = !!selected[t.id];
                    const reason = suggestionReasons[t.id];
                    return (
                      <tr
                        key={t.id}
                        className={cn(
                          "border-t hover:bg-muted/30 cursor-pointer",
                          isSel && "bg-primary/5"
                        )}
                        onClick={() => toggle(t)}
                      >
                        <td className="p-2 relative">
                          {bucket === "overdue" && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-destructive" />
                          )}
                          {bucket === "soon" && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                          )}
                          <Checkbox checked={isSel} onCheckedChange={() => toggle(t)} />
                        </td>
                        <td className="p-2">
                          <div className="font-medium flex items-center gap-1.5">
                            {t.title}
                            {reason && isSel && (
                              <Badge variant="outline" className="text-[9px] bg-primary/10">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                {reason}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {t.status} · #{t.id.slice(0, 8)}
                            {bucket === "overdue" && (
                              <span className="text-destructive ml-1.5">SLA vencido</span>
                            )}
                            {bucket === "soon" && (
                              <span className="text-amber-600 ml-1.5">SLA &lt; 24h</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px]">
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs truncate">{t.assignedName || "—"}</td>
                        {showPoints && (
                          <td className="p-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              min={1}
                              className="h-7 w-14 text-xs"
                              value={points[t.id] ?? t.categoryScore ?? 1}
                              onChange={(e) =>
                                setPoints((prev) => ({ ...prev, [t.id]: Number(e.target.value) }))
                              }
                              disabled={!isSel}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Painel de impacto */}
          <SprintImpactPanel impact={impact} sprintName={targetSprint?.name} />

          {willBlock && (
            <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Modo de capacidade rígida está ativo neste projeto. Não é possível confirmar
                excedendo a capacidade. Desmarque chamados ou aumente a capacidade da sprint.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={selectedIds.length === 0 || willBlock || linkMut.isPending}>
            Vincular {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
