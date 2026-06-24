import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useBacklog, useUpdateBacklogItem, TASK_STATUSES, TASK_PRIORITIES } from "@/hooks/useBacklog";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  "Em Desenvolvimento": "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "Em Homologação": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Concluído: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Retrabalho: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const PRIO_COLORS: Record<string, string> = {
  Baixa: "bg-slate-500/15 text-slate-700",
  Média: "bg-blue-500/15 text-blue-700",
  Alta: "bg-amber-500/15 text-amber-700",
  Crítica: "bg-red-500/15 text-red-700",
};

export default function ProjetosBacklog() {
  const { data: items = [], isLoading } = useBacklog();
  const updateItem = useUpdateBacklogItem();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [prioFilter, setPrioFilter] = useState("all");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (prioFilter !== "all" && i.priority !== prioFilter) return false;
      if (s && !i.title.toLowerCase().includes(s) && !i.project_name?.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [items, search, statusFilter, prioFilter]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Backlog</h1>
        <p className="text-sm text-muted-foreground">Todas as tarefas dos projetos da sua organização.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={prioFilter} onValueChange={setPrioFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="card-elevated divide-y divide-border">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando backlog...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum item no backlog.</div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="p-3 flex items-center gap-3 text-sm hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                  <span>{item.project_name || "Projeto"}</span>
                  <span>· {item.assignee_name || "Não atribuído"}</span>
                  {item.planned_date && (
                    <span>· Planejado: {format(new Date(item.planned_date), "dd/MM/yyyy")}</span>
                  )}
                  {item.rework_count > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700">
                      {item.rework_count}x retrabalho
                    </Badge>
                  )}
                </div>
              </div>

              <Badge variant="outline" className={`text-[10px] ${PRIO_COLORS[item.priority] || ""}`}>
                {item.priority}
              </Badge>

              <Select
                value={item.status}
                onValueChange={(v) => updateItem.mutate({ id: item.id, status: v })}
              >
                <SelectTrigger className={`h-7 w-40 text-xs ${STATUS_COLORS[item.status] || ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min={1}
                value={item.story_points}
                onChange={(e) => updateItem.mutate({ id: item.id, story_points: Number(e.target.value) })}
                className="h-7 w-14 text-xs"
                title="Story points"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
