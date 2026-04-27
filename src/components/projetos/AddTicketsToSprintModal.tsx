import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useAvailableTickets,
  useLinkTicketsToProject,
  ProjectTicket,
} from "@/hooks/useProjectTickets";
import { useSprints } from "@/hooks/useSprints";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  defaultSprintId?: string | null;
}

const PRIORITIES = ["Crítica", "Alta", "Média", "Baixa"];
const PRIORITY_WEIGHT: Record<string, number> = { Crítica: 4, Alta: 3, Média: 2, Baixa: 1 };
const OPEN_STATUSES = ["Aberto", "Em Andamento", "Disponível", "Aguardando Aprovação"];
const CLOSED_STATUSES = ["Fechado", "Aprovado", "Cancelado"];
type StatusFilter = "open" | "closed" | "all";

function slaBucket(t: ProjectTicket): "overdue" | "soon" | "ok" {
  const sla = (t as any).sla_deadline;
  if (!sla) return "ok";
  const diff = new Date(sla).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

export default function AddTicketsToSprintModal({
  open,
  onOpenChange,
  projectId,
  defaultSprintId,
}: Props) {
  const { data: tickets = [], isLoading } = useAvailableTickets();
  const { data: sprints = [] } = useSprints(projectId);
  const linkMut = useLinkTicketsToProject();

  const [search, setSearch] = useState("");
  const [priorities, setPriorities] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [technicianId, setTechnicianId] = useState<string>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sprintId, setSprintId] = useState<string>("backlog");

  useEffect(() => {
    if (!open) return;
    setSelected({});
    setSearch("");
    setPriorities(new Set());
    setStatusFilter("open");
    setTechnicianId("all");

    if (defaultSprintId) {
      setSprintId(defaultSprintId);
    } else {
      const active = sprints.find((s) => s.status === "ativa");
      const planned = sprints.find((s) => s.status === "planejada");
      setSprintId(active?.id || planned?.id || "backlog");
    }
  }, [open, defaultSprintId, sprints]);

  // Lista de técnicos únicos com base nos chamados disponíveis
  const technicians = useMemo(() => {
    const map = new Map<string, string>();
    tickets.forEach((t) => {
      if (t.assigned_to && t.assignedName) {
        map.set(t.assigned_to, t.assignedName);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets]);

  const filtered = useMemo(() => {
    let list = tickets.filter((t) => {
      if (statusFilter === "open" && !OPEN_STATUSES.includes(t.status)) return false;
      if (statusFilter === "closed" && !CLOSED_STATUSES.includes(t.status)) return false;
      if (priorities.size > 0 && !priorities.has(t.priority)) return false;
      if (technicianId !== "all") {
        if (technicianId === "unassigned") {
          if (t.assigned_to) return false;
        } else if (t.assigned_to !== technicianId) {
          return false;
        }
      }
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

    // SLA vencido primeiro, depois prioridade
    list = [...list].sort((a, b) => {
      const aBucket = slaBucket(a);
      const bBucket = slaBucket(b);
      const bucketRank: Record<string, number> = { overdue: 0, soon: 1, ok: 2 };
      if (bucketRank[aBucket] !== bucketRank[bBucket]) return bucketRank[aBucket] - bucketRank[bBucket];
      return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
    });
    return list;
  }, [tickets, priorities, search, statusFilter, technicianId]);

  function toggle(t: ProjectTicket) {
    setSelected((prev) => ({ ...prev, [t.id]: !prev[t.id] }));
  }

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  async function submit() {
    if (selectedIds.length === 0) return;
    try {
      await linkMut.mutateAsync({
        ticketIds: selectedIds,
        projectId,
        sprintId: sprintId === "backlog" ? null : sprintId,
        pointsByTicket: {},
      });
      onOpenChange(false);
    } catch {
      // toast no hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar chamados</DialogTitle>
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
                <SelectItem value="backlog">Backlog (sem sprint)</SelectItem>
                {sprints
                  .filter((s) => s.status !== "cancelada")
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.status === "ativa" && " • ATIVA"}
                      {s.status === "concluida" && " • concluída"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Busca + filtros */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, técnico ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              {(["open", "closed", "all"] as StatusFilter[]).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={statusFilter === f ? "default" : "ghost"}
                  className="h-6 text-[11px] px-2"
                  onClick={() => setStatusFilter(f)}
                >
                  {f === "open" ? "Abertos" : f === "closed" ? "Fechados" : "Todos"}
                </Button>
              ))}
            </div>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger className="h-7 text-xs w-[180px]">
                <SelectValue placeholder="Técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os técnicos</SelectItem>
                <SelectItem value="unassigned">Sem técnico</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const bucket = slaBucket(t);
                    const isSel = !!selected[t.id];
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
                          <div className="font-medium">{t.title}</div>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={selectedIds.length === 0 || linkMut.isPending}>
            Vincular {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
