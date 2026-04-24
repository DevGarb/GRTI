import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FolderKanban, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useProject, useDeleteProject } from "@/hooks/useProjects";
import { useSprints } from "@/hooks/useSprints";
import SprintCard from "@/components/projetos/SprintCard";
import SprintItems from "@/components/projetos/SprintItems";
import NewSprintModal from "@/components/projetos/NewSprintModal";
import NewProjectModal from "@/components/projetos/NewProjectModal";
import AddTicketsToSprintModal from "@/components/projetos/AddTicketsToSprintModal";
import NewTaskModal from "@/components/projetos/NewTaskModal";
import ProjectDashboard from "@/components/projetos/ProjectDashboard";
import { useNavigate } from "react-router-dom";

export default function ProjetoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: sprints = [] } = useSprints(id);
  const deleteMut = useDeleteProject();

  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [addTicketsOpen, setAddTicketsOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando projeto...</div>;
  if (!project) return <div className="p-6">Projeto não encontrado.</div>;

  const target = project.total_points_target || 1;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Link to="/projetos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <FolderKanban className="h-5 w-5 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {project.code && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {project.code}
              </span>
            )}
            <h1 className="text-xl font-bold truncate">{project.name}</h1>
            <Badge variant="outline">{project.status}</Badge>
          </div>
          {project.goal && <p className="text-sm text-muted-foreground mt-0.5">{project.goal}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditProjectOpen(true)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm(`Excluir projeto "${project.name}"? Os chamados serão desvinculados.`)) {
              deleteMut.mutate(project.id, { onSuccess: () => navigate("/projetos") });
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="backlog">Backlog</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Meta de pontos</span>
              <span className="font-mono">{project.total_points_target} pts</span>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
            )}
            {(project.start_date || project.end_date) && (
              <p className="text-xs text-muted-foreground mt-3">
                {project.start_date && new Date(project.start_date).toLocaleDateString("pt-BR")}
                {" → "}
                {project.end_date && new Date(project.end_date).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
          <ProjectDashboard project={project} />
        </TabsContent>

        <TabsContent value="sprints" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setSprintModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova sprint
            </Button>
          </div>
          {sprints.length === 0 ? (
            <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
              Nenhuma sprint criada. Comece criando uma sprint para organizar entregas.
            </div>
          ) : (
            sprints.map((s) => <SprintCard key={s.id} sprint={s} projectId={project.id} />)
          )}
        </TabsContent>

        <TabsContent value="backlog" className="space-y-3 mt-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova tarefa
            </Button>
            <Button onClick={() => setAddTicketsOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar chamados
            </Button>
          </div>
          <div className="card-elevated">
            <SprintItems projectId={project.id} sprintId={null} />
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <ProjectDashboard project={project} />
        </TabsContent>
      </Tabs>

      <NewSprintModal open={sprintModalOpen} onOpenChange={setSprintModalOpen} projectId={project.id} />
      <NewProjectModal open={editProjectOpen} onOpenChange={setEditProjectOpen} project={project} />
      <AddTicketsToSprintModal open={addTicketsOpen} onOpenChange={setAddTicketsOpen} projectId={project.id} />
      <NewTaskModal open={newTaskOpen} onOpenChange={setNewTaskOpen} projectId={project.id} />
    </div>
  );
}
