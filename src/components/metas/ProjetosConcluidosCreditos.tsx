import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgProfiles } from "@/hooks/useOrgProfiles";
import { useProjectCredits, useProjectCreditMutations } from "@/hooks/useProjectCredits";
import { formatDateBR } from "@/lib/dateFormat";
import { Rocket, X, Plus, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  year: number;
  month: number;
}

interface CompletedProject {
  id: string;
  name: string;
  code: string | null;
  completed_at: string | null;
  completed_by: string | null;
}

export default function ProjetosConcluidosCreditos({ year, month }: Props) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  const members = useOrgProfiles();
  const [addingFor, setAddingFor] = useState<string | null>(null);

  const from = new Date(year, month - 1, 1).toISOString();
  const to = new Date(year, month, 1).toISOString();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["completed-projects", orgId, year, month],
    queryFn: async () => {
      let q = supabase
        .from("projects")
        .select("id, name, code, completed_at, completed_by")
        .eq("status", "Concluído")
        .gte("completed_at", from)
        .lt("completed_at", to)
        .order("completed_at", { ascending: false });
      if (orgId) q = q.eq("organization_id", orgId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CompletedProject[];
    },
  });

  const ids = useMemo(() => projects.map((p) => p.id), [projects]);
  const { data: credits = [] } = useProjectCredits(ids);
  const { addCredit, removeCredit } = useProjectCreditMutations();

  const nameOf = (uid: string) =>
    members.find((m) => m.user_id === uid)?.full_name || "Usuário";

  return (
    <div className="card-elevated p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Projetos concluídos no mês</h3>
        <span className="text-[11px] text-muted-foreground">
          Atribua os membros que recebem o projeto como entrega na meta
        </span>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum projeto concluído neste período.
        </p>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => {
            const pc = credits.filter((c) => c.project_id === p.id);
            const available = members.filter((m) => !pc.some((c) => c.user_id === m.user_id));
            return (
              <div key={p.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {p.code ? `${p.code} · ` : ""}{p.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {p.completed_at ? formatDateBR(p.completed_at) : "—"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {pc.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] px-2 py-0.5"
                    >
                      {nameOf(c.user_id)}
                      <button
                        onClick={() => removeCredit.mutate(c.id)}
                        className="hover:text-destructive"
                        aria-label="Remover crédito"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {pc.length === 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      Sem crédito — contando para {p.completed_by ? nameOf(p.completed_by) : "ninguém"}
                    </span>
                  )}

                  {addingFor === p.id ? (
                    <Select
                      onValueChange={(uid) => {
                        addCredit.mutate({ projectId: p.id, userId: uid });
                        setAddingFor(null);
                      }}
                    >
                      <SelectTrigger className="h-7 w-56 text-xs">
                        <SelectValue placeholder="Escolher membro..." />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <button
                      onClick={() => setAddingFor(p.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border text-[11px] px-2 py-0.5 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Atribuir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
