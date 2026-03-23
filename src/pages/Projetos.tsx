import { mockProjects } from "@/data/mockData";
import { FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  "Planejamento": "status-waiting",
  "Em andamento": "status-open",
  "Concluído": "status-closed",
};

export default function Projetos() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <FolderKanban className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
          <p className="text-sm text-muted-foreground">Projetos internos de TI</p>
        </div>
      </div>

      <div className="grid gap-4">
        {mockProjects.map((project) => (
          <div key={project.id} className="card-elevated p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
                <p className="text-[12px] text-muted-foreground mt-1">{project.description}</p>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                  <span>Responsável: {project.owner}</span>
                  <span>•</span>
                  <span>{project.startDate} → {project.endDate}</span>
                </div>
              </div>
              <span className={cn("status-badge", statusStyles[project.status])}>
                {project.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
