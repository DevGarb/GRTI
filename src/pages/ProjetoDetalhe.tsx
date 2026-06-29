import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FolderKanban, Plus, Pencil, Trash2, CheckCircle2, RotateCcw, User, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useProject, useDeleteProject, useUpdateProject } from "@/hooks/useProjects";
import { useSprints } from "@/hooks/useSprints";
import { useAuth } from "@/contexts/AuthContext";
import SprintCard from "@/components/projetos/SprintCard";
import SprintItems from "@/components/projetos/SprintItems";
import NewSprintModal from "@/components/projetos/NewSprintModal";
import NewProjectModal from "@/components/projetos/NewProjectModal";
import AddTicketsToSprintModal from "@/components/projetos/AddTicketsToSprintModal";
import NewTaskModal from "@/components/projetos/NewTaskModal";
import ProjectOverview from "@/components/projetos/ProjectOverview";
import CompleteProjectModal, { SIZE_LABEL } from "@/components/projetos/CompleteProjectModal";

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function ProjetoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: sprints = [] } = useSprints(id);
  const deleteMut = useDeleteProject();
  const updateMut = useUpdateProject();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin" as any);

  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [addToActiveOpen, setAddToActiveOpen] = useState(false);
  const [addToBacklogOpen, setAddToBacklogOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const ownerIds = project ? [project.owner_id, project.co_owner_id].filter(Boolean) as string[] : [];
  const { data: ownerProfiles = [] } = useQuery({
    queryKey: ["projeto-detalhe-owners", id, ownerIds.join(",")],
    queryFn: async () => {
      if (ownerIds.length === 0) return [] as Array<{ user_id: string; full_name: string }>;
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ownerIds);
      const found = (data || []) as Array<{ user_id: string; full_name: string }>;
      const missing = ownerIds.filter((uid) => !found.some((p) => p.user_id === uid));
      if (missing.length === 0) return found;
      const { data: techs } = await (supabase as any).rpc("get_org_technicians");
      const extra = ((techs as any[]) || [])
        .filter((t: any) => missing.includes(t.user_id))
        .map((t: any) => ({ user_id: t.user_id, full_name: t.full_name }));
      return [...found, ...extra];
    },
    enabled: ownerIds.length > 0,
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando projeto...</div>;
  if (!project) return <div className="p-6">Projeto não encontrado.</div>;

  const ownerName = ownerProfiles.find((p: any) => p.user_id === project.owner_id)?.full_name;
  const coOwnerName = ownerProfiles.find((p: any) => p.user_id === project.co_owner_id)?.full_name;
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
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => setEditProjectOpen(true)}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                ownerName
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
              }`}
              title="Editar responsável"
            >
              <User className="h-3 w-3" />
              Responsável: {ownerName || "definir"}
            </button>
            <button
              type="button"
              onClick={() => setEditProjectOpen(true)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
              title="Editar co-responsável"
            >
              <Users className="h-3 w-3" />
              Co-responsável: {coOwnerName || "—"}
            </button>
          </div>
          {project.status === "Concluído" && (project.size || project.value_brl != null) && (
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Concluído{project.completed_at ? ` em ${new Date(project.completed_at).toLocaleDateString("pt-BR")}` : ""}
              </span>
              {project.size && <Badge variant="outline" className="text-[10px]">{SIZE_LABEL[project.size] || project.size}</Badge>}
              {project.value_brl != null && <span className="font-mono">{formatBRL(Number(project.value_brl))}</span>}
            </div>
          )}
        </div>
        {isAdmin && project.status !== "Concluído" && (
          <Button size="sm" onClick={() => setCompleteOpen(true)}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir projeto
          </Button>
        )}
        {isAdmin && project.status === "Concluído" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Reabrir este projeto? Ele voltará para 'Em Andamento'.")) {
                updateMut.mutate({
                  id: project.id,
                  status: "Em Andamento",
                  completed_at: null,
                  completed_by: null,
                } as any);
              }
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reabrir
          </Button>
        )}
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
      <CompleteProjectModal
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        projectId={project.id}
        initialSize={project.size}
        initialValue={project.value_brl != null ? Number(project.value_brl) : null}
      />
    </div>
  );
}
