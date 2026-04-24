import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FolderKanban, Plus, Pencil, Trash2, Sparkles } from "lucide-react";
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
import EfficiencyDashboard from "@/components/projetos/EfficiencyDashboard";
import TeamCapacityTab from "@/components/projetos/TeamCapacityTab";

export default function ProjetoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: sprints = [] } = useSprints(id);
  const deleteMut = useDeleteProject();

  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [addTicketsOpen, setAddTicketsOpen] = useState(false);
  const [addToActiveOpen, setAddToActiveOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando projeto...</div>;
  if (!project) return <div className="p-6">Projeto não encontrado.</div>;

  const activeSprint = sprints.find((s) => s.status === "ativa");
  const activePct = activeSprint && activeSprint.capacity_points > 0
    ? Math.min(100, Math.round((activeSprint.totalPoints / activeSprint.capacity_points) * 100))
    : 0;
  const activeDonePct = activeSprint && activeSprint.totalPoints > 0
    ? Math.round((activeSprint.completedPoints / activeSprint.totalPoints) * 100)
    : 0;

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
            {project.enforce_capacity && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300">
                Capacidade rígida
              </Badge>
            )}
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
          <TabsTrigger value="backlog">Não planejados</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="efficiency">Eficiência</TabsTrigger>
          <TabsTrigger value="team">Capacidade da equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Bloco sprint ativa */}
          {activeSprint ? (
            <div className="card-elevated p-5 border-l-4 border-l-blue-500">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px]">
                      Sprint ativa
                    </Badge>
                    <h3 className="font-semibold text-sm">{activeSprint.name}</h3>
                  </div>
                  {activeSprint.goal && (
                    <p className="text-xs text-muted-foreground mt-1">{activeSprint.goal}</p>
                  )}
                </div>
                <Button size="sm" onClick={() => setAddToActiveOpen(true)}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Adicionar chamados
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Capacidade: {activeSprint.totalPoints}/{activeSprint.capacity_points || "∞"} pts
                  </span>
                  <span className="text-muted-foreground">
                    Concluído: {activeSprint.completedPoints} pts ({activeDonePct}%)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Progress value={activePct} className="h-1.5" />
                  <Progress value={activeDonePct} className="h-1.5 [&>div]:bg-emerald-500" />
                </div>
              </div>
            </div>
          ) : (
            <div className="card-elevated p-5 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Nenhuma sprint ativa. Crie uma sprint e ative para começar a planejar.
              </p>
              <Button size="sm" onClick={() => setSprintModalOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nova sprint
              </Button>
            </div>
          )}

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
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Chamados deste projeto que ainda não estão em nenhuma sprint.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setNewTaskOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova tarefa
              </Button>
              <Button onClick={() => setAddTicketsOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar chamados
              </Button>
            </div>
          </div>
          <div className="card-elevated">
            <SprintItems projectId={project.id} sprintId={null} />
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <ProjectDashboard project={project} />
        </TabsContent>

        <TabsContent value="efficiency" className="mt-4">
          <EfficiencyDashboard projectId={project.id} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamCapacityTab project={project} />
        </TabsContent>
      </Tabs>

      <NewSprintModal open={sprintModalOpen} onOpenChange={setSprintModalOpen} projectId={project.id} />
      <NewProjectModal open={editProjectOpen} onOpenChange={setEditProjectOpen} project={project} />
      <AddTicketsToSprintModal open={addTicketsOpen} onOpenChange={setAddTicketsOpen} projectId={project.id} />
      <AddTicketsToSprintModal
        open={addToActiveOpen}
        onOpenChange={setAddToActiveOpen}
        projectId={project.id}
        defaultSprintId={activeSprint?.id || null}
      />
      <NewTaskModal open={newTaskOpen} onOpenChange={setNewTaskOpen} projectId={project.id} />
    </div>
  );
}
