import { Link } from "react-router-dom";
import { ProjectAggregate } from "@/hooks/useProjects";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Ticket, Zap } from "lucide-react";

const statusStyles: Record<string, string> = {
  "Planejamento": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "Em andamento": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "Em Andamento": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "Concluído": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "Cancelado": "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export default function ProjectCard({ project }: { project: ProjectAggregate }) {
  const target = project.total_points_target || project.totalPoints || 1;
  const pct = Math.min(100, Math.round((project.completedPoints / target) * 100));

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
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progresso</span>
            <span className="font-mono">{project.completedPoints} / {target} pts</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Ticket className="h-3 w-3" /> {project.totalLinkedTickets} chamados</span>
          <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {project.activeSprints} sprint(s) ativa(s)</span>
          {project.start_date && (
            <span className="flex items-center gap-1 ml-auto">
              <Calendar className="h-3 w-3" />
              {new Date(project.start_date).toLocaleDateString("pt-BR")}
              {project.end_date && ` → ${new Date(project.end_date).toLocaleDateString("pt-BR")}`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
