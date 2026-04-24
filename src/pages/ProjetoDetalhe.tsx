import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FolderKanban, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useProject, useDeleteProject } from "@/hooks/useProjects";
import { useSprints } from "@/hooks/useSprints";
import SprintCard from "@/components/projetos/SprintCard";
import SprintItems from "@/components/projetos/SprintItems";
import NewSprintModal from "@/components/projetos/NewSprintModal";
import NewProjectModal from "@/components/projetos/NewProjectModal";
import AddTicketsToSprintModal from "@/components/projetos/AddTicketsToSprintModal";
import NewTaskModal from "@/components/projetos/NewTaskModal";
import ProjectOverview from "@/components/projetos/ProjectOverview";

export default function ProjetoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: sprints = [] } = useSprints(id);
  const deleteMut = useDeleteProject();

  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [addToActiveOpen, setAddToActiveOpen] = useState(false);
  const [addToBacklogOpen, setAddToBacklogOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando projeto...</div>;
  if (!project) return <div className="p-6">Projeto não encontrado.</div>;

  const activeSprint = sprints.find((s) => s.status === "ativa");

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
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ProjectOverview
            project={project}
            sprints={sprints}
            onAddToActive={() => setAddToActiveOpen(true)}
            onCreateSprint={() => setSprintModalOpen(true)}
          />
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Tarefas manuais e chamados ainda não colocados em uma sprint.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setNewTaskOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova tarefa
              </Button>
              <Button onClick={() => setAddToBacklogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar chamados
              </Button>
            </div>
          </div>
          <div className="card-elevated">
            <SprintItems projectId={project.id} sprintId={null} />
          </div>
        </TabsContent>
      </Tabs>

      <NewSprintModal open={sprintModalOpen} onOpenChange={setSprintModalOpen} projectId={project.id} />
      <NewProjectModal open={editProjectOpen} onOpenChange={setEditProjectOpen} project={project} />
      <AddTicketsToSprintModal
        open={addToActiveOpen}
        onOpenChange={setAddToActiveOpen}
        projectId={project.id}
        defaultSprintId={activeSprint?.id || null}
      />
      <AddTicketsToSprintModal
        open={addToBacklogOpen}
        onOpenChange={setAddToBacklogOpen}
        projectId={project.id}
        defaultSprintId={null}
      />
      <NewTaskModal open={newTaskOpen} onOpenChange={setNewTaskOpen} projectId={project.id} />
    </div>
  );
}
