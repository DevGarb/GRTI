import { useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects } from "@/hooks/useProjects";
import ProjectCard from "@/components/projetos/ProjectCard";
import NewProjectModal from "@/components/projetos/NewProjectModal";

export default function Projetos() {
  const { data: projects = [], isLoading } = useProjects();
  const [modalOpen, setModalOpen] = useState(false);

  const ativos = projects.filter((p) => p.status !== "Concluído");
  const concluidos = projects.filter((p) => p.status === "Concluído");

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
            <p className="text-sm text-muted-foreground">
              Planejamento ágil integrado com chamados, sprints e pontuação
            </p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo projeto
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando projetos...</div>
      ) : (
        <Tabs defaultValue="ativos">
          <TabsList>
            <TabsTrigger value="ativos">Ativos ({ativos.length})</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="ativos" className="mt-4">
            {ativos.length === 0 ? (
              <div className="card-elevated p-10 text-center">
                <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold">Nenhum projeto ativo</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie um projeto para começar a planejar sprints e vincular chamados.
                </p>
                <Button className="mt-4" onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Criar primeiro projeto
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ativos.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="concluidos" className="mt-4">
            {concluidos.length === 0 ? (
              <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
                Nenhum projeto concluído ainda.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {concluidos.map((p) => <ProjectCard key={p.id} project={p} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <NewProjectModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
