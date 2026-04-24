import { useState } from "react";
import {
  useTechnicianCapacity,
  useUpsertTechnicianCapacity,
} from "@/hooks/useTechnicianCapacity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateProject, Project } from "@/hooks/useProjects";
import { Users, Save } from "lucide-react";

interface Props {
  project: Project;
}

export default function TeamCapacityTab({ project }: Props) {
  const { data: caps = [], isLoading } = useTechnicianCapacity(project.id);
  const upsert = useUpsertTechnicianCapacity();
  const updateProject = useUpdateProject();
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [enforce, setEnforce] = useState(project.enforce_technician_capacity ?? false);

  function setDraft(userId: string, val: number) {
    setDrafts((d) => ({ ...d, [userId]: val }));
  }

  function save(userId: string) {
    const val = drafts[userId];
    if (val == null) return;
    upsert.mutate({ userId, projectId: project.id, points: val });
    setDrafts((d) => {
      const n = { ...d };
      delete n[userId];
      return n;
    });
  }

  return (
    <div className="space-y-4">
      <div className="card-elevated p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm font-medium">Capacidade da equipe</div>
            <div className="text-xs text-muted-foreground">
              Quantos pontos cada técnico consegue absorver por sprint.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="enforce-tech"
            checked={enforce}
            onCheckedChange={(v) => {
              setEnforce(v);
              updateProject.mutate({ id: project.id, enforce_technician_capacity: v } as any);
            }}
          />
          <Label htmlFor="enforce-tech" className="text-xs cursor-pointer">
            Bloquear ao exceder
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
      ) : caps.length === 0 ? (
        <div className="card-elevated p-6 text-center text-sm text-muted-foreground">
          Nenhum técnico encontrado na organização.
        </div>
      ) : (
        <div className="card-elevated divide-y divide-border">
          {caps.map((c) => {
            const draft = drafts[c.user_id];
            const dirty = draft != null && draft !== c.points_per_sprint;
            return (
              <div key={c.user_id} className="p-3 flex items-center gap-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{c.fullName || "—"}</div>
                  {c.project_id == null && (
                    <div className="text-[10px] text-muted-foreground">
                      Usando capacidade padrão
                    </div>
                  )}
                </div>
                <Input
                  type="number"
                  min={0}
                  className="h-8 w-20 text-xs"
                  value={draft ?? c.points_per_sprint}
                  onChange={(e) => setDraft(c.user_id, Number(e.target.value))}
                />
                <span className="text-xs text-muted-foreground">pts/sprint</span>
                <Button
                  size="sm"
                  variant={dirty ? "default" : "ghost"}
                  disabled={!dirty}
                  onClick={() => save(c.user_id)}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
