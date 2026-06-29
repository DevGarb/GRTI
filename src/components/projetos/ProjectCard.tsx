import { Link } from "react-router-dom";
import { ProjectAggregate } from "@/hooks/useProjects";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, ListTodo, Zap, DollarSign, CheckCircle2, User, Users, Layers } from "lucide-react";

const SIZE_LABEL: Record<string, string> = {
  pequeno: "Pequeno porte",
  medio: "Médio porte",
  grande: "Grande porte",
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const statusStyles: Record<string, string> = {
  "Planejamento": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "Em andamento": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "Em Andamento": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "Concluído": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "Cancelado": "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export default function ProjectCard({ project }: { project: ProjectAggregate }) {
  const pct = project.sprintProgressPct;

  return (
    <Link to={`/projetos/${project.id}`} className="block">
      <div className="card-elevated p-5 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {project.code && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {project.code}
                </span>
              )}
              <h3 className="text-sm font-semibold text-foreground truncate">{project.name}</h3>
            </div>
            {project.goal && <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{project.goal}</p>}
          </div>
          <Badge variant="outline" className={cn("border", statusStyles[project.status] || "")}>
            {project.status}
          </Badge>
        </div>

        <div className="mt-4 space-y-2">
          {project.totalSprints > 0 ? (
            <>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Progresso por sprints</span>
                <span className="font-mono">
                  {project.completedSprints} / {project.totalSprints} ({pct}%)
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </>
          ) : (
            <div className="text-[11px] text-muted-foreground italic">Nenhuma sprint criada</div>
          )}
        </div>


        {(project.ownerName || project.coOwnerName) && (
          <div className="flex items-center flex-wrap gap-2 mt-3 text-[11px]">
            {project.ownerName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                <User className="h-3 w-3" /> {project.ownerName}
              </span>
            )}
            {project.coOwnerName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                <Users className="h-3 w-3" /> {project.coOwnerName}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><ListTodo className="h-3 w-3" /> {project.backlogTasks} no backlog</span>
          <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {project.totalSprints} sprint(s)</span>
          <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {project.activeSprints} ativa(s)</span>
          {project.start_date && (
            <span className="flex items-center gap-1 ml-auto">
              <Calendar className="h-3 w-3" />
              {new Date(project.start_date).toLocaleDateString("pt-BR")}
              {project.end_date && ` → ${new Date(project.end_date).toLocaleDateString("pt-BR")}`}
            </span>
          )}
        </div>


        {project.status === "Concluído" && (project.size || project.value_brl != null || project.completed_at) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              {project.completed_at ? new Date(project.completed_at).toLocaleDateString("pt-BR") : "Concluído"}
            </span>
            {project.size && (
              <Badge variant="outline" className="text-[10px]">{SIZE_LABEL[project.size] || project.size}</Badge>
            )}
            {project.value_brl != null && (
              <span className="inline-flex items-center gap-1 ml-auto font-mono text-foreground">
                <DollarSign className="h-3 w-3" /> {formatBRL(Number(project.value_brl))}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
