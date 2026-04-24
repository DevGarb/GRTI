import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAvailableTickets, useLinkTicketsToProject, ProjectTicket } from "@/hooks/useProjectTickets";
import { useSprints } from "@/hooks/useSprints";
import { AlertTriangle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  defaultSprintId?: string | null;
}

const PRIORITIES = ["Crítica", "Alta", "Média", "Baixa"];

export default function AddTicketsToSprintModal({ open, onOpenChange, projectId, defaultSprintId = null }: Props) {
  const { data: tickets = [], isLoading } = useAvailableTickets();
  const { data: sprints = [] } = useSprints(projectId);
  const linkMut = useLinkTicketsToProject();

  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [points, setPoints] = useState<Record<string, number>>({});
  const [sprintId, setSprintId] = useState<string>(defaultSprintId || "backlog");

  useEffect(() => {
    if (open) {
      setSelected({});
      setPoints({});
      setSearch("");
      setPriority("all");
      setSprintId(defaultSprintId || "backlog");
    }
  }, [open, defaultSprintId]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (priority !== "all" && t.priority !== priority) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!t.title.toLowerCase().includes(s) && !(t.assignedName || "").toLowerCase().includes(s) && !t.id.includes(s)) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, search, priority]);

  function toggle(t: ProjectTicket) {
    setSelected((prev) => {
      const next = { ...prev, [t.id]: !prev[t.id] };
      return next;
    });
    setPoints((prev) => {
      if (prev[t.id] !== undefined) return prev;
      return { ...prev, [t.id]: t.categoryScore ?? 1 };
    });
  }

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const totalSelectedPoints = selectedIds.reduce((s, id) => s + (points[id] || 0), 0);

  const targetSprint = sprints.find((s) => s.id === sprintId);
  const willExceed = targetSprint
    ? targetSprint.totalPoints + totalSelectedPoints > (targetSprint.capacity_points || 0) &&
      targetSprint.capacity_points > 0
    : false;

  async function submit() {
    if (selectedIds.length === 0) return;
    await linkMut.mutateAsync({
      ticketIds: selectedIds,
      projectId,
      sprintId: sprintId === "backlog" ? null : sprintId,
      pointsByTicket: points,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar chamados ao projeto</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, técnico ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Lista */}
          <div className="border rounded-md flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando chamados...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum chamado disponível. Todos podem já estar vinculados ou fechados.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-2 w-10"></th>
                    <th className="p-2 text-left">Chamado</th>
                    <th className="p-2 text-left">Prioridade</th>
                    <th className="p-2 text-left">Técnico</th>
                    <th className="p-2 text-left w-20">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t hover:bg-muted/30">
                      <td className="p-2">
                        <Checkbox checked={!!selected[t.id]} onCheckedChange={() => toggle(t)} />
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{t.title}</div>
                        <div className="text-[11px] text-muted-foreground">{t.status} · #{t.id.slice(0, 8)}</div>
                      </td>
                      <td className="p-2"><Badge variant="outline">{t.priority}</Badge></td>
                      <td className="p-2">{t.assignedName || "—"}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-16"
                          value={points[t.id] ?? t.categoryScore ?? 1}
                          onChange={(e) => setPoints((prev) => ({ ...prev, [t.id]: Number(e.target.value) }))}
                          disabled={!selected[t.id]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Destino */}
          <div className="flex items-center gap-3 pt-1">
            <Label className="whitespace-nowrap">Destino:</Label>
            <Select value={sprintId} onValueChange={setSprintId}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Apenas backlog (sem sprint)</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.totalPoints}/{s.capacity_points} pts) {s.status === "ativa" && "• ativa"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn("flex items-center justify-between text-sm rounded-md px-3 py-2",
            willExceed ? "bg-destructive/10 text-destructive" : "bg-muted/40 text-muted-foreground")}>
            <span>
              {selectedIds.length} chamado(s) selecionado(s) · {totalSelectedPoints} pontos
            </span>
            {targetSprint && (
              <span className="flex items-center gap-1">
                {willExceed && <AlertTriangle className="h-3.5 w-3.5" />}
                Capacidade após adicionar: {targetSprint.totalPoints + totalSelectedPoints}/{targetSprint.capacity_points}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={selectedIds.length === 0 || linkMut.isPending}>
            Vincular {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
