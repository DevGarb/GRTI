import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DevDelivery {
  userId: string | null;
  name: string;
  items: number;
  points: number;
  pctItems: number;
  pctPoints: number;
}

export interface ProjectDelivery {
  totalTasks: number;
  doneTasks: number;
  totalPoints: number;
  donePoints: number;
  pctItems: number;
  pctPoints: number;
  byDev: DevDelivery[];
}

const DONE = "Concluído";

/** Nomes de usuários (profiles + fallback RPC de técnicos da org). */
async function resolveNames(userIds: string[]) {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
  for (const p of (data || []) as any[]) map.set(p.user_id, p.full_name);
  const missing = userIds.filter((id) => !map.has(id));
  if (missing.length > 0) {
    const { data: techs } = await supabase.rpc("get_org_technicians");
    for (const t of ((techs as any[]) || [])) {
      if (missing.includes(t.user_id)) map.set(t.user_id, t.full_name);
    }
  }
  return map;
}

/**
 * Progresso do projeto (itens e pontos) e quantitativo por desenvolvedor.
 * Crédito: credited_to > quem moveu para "Concluído" > responsável da tarefa.
 */
export function useProjectDelivery(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-delivery", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectDelivery> => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select("id, status, story_points, assignee_id, credited_to")
        .eq("project_id", projectId!);
      if (error) throw error;
      const tasks = (data || []) as any[];

      const empty: ProjectDelivery = {
        totalTasks: 0,
        doneTasks: 0,
        totalPoints: 0,
        donePoints: 0,
        pctItems: 0,
        pctPoints: 0,
        byDev: [],
      };
      if (tasks.length === 0) return empty;

      const totalTasks = tasks.length;
      const totalPoints = tasks.reduce((s, t) => s + (t.story_points || 0), 0);
      const doneList = tasks.filter((t) => t.status === DONE);
      const doneTasks = doneList.length;
      const donePoints = doneList.reduce((s, t) => s + (t.story_points || 0), 0);

      // Quem concluiu (última transição para "Concluído")
      const closerOf = new Map<string, string>();
      if (doneList.length > 0) {
        const { data: hist } = await supabase
          .from("task_status_history")
          .select("task_id, new_status, changed_by, changed_at")
          .in("task_id", doneList.map((t) => t.id))
          .eq("new_status", DONE)
          .order("changed_at", { ascending: true });
        for (const h of ((hist as any[]) || [])) {
          if (h.changed_by) closerOf.set(h.task_id, h.changed_by);
        }
      }

      const agg = new Map<string, { items: number; points: number }>();
      for (const t of doneList) {
        const uid: string = t.credited_to || closerOf.get(t.id) || t.assignee_id || "__none__";
        const cur = agg.get(uid) || { items: 0, points: 0 };
        cur.items += 1;
        cur.points += t.story_points || 0;
        agg.set(uid, cur);
      }

      const names = await resolveNames([...agg.keys()].filter((k) => k !== "__none__"));

      const byDev: DevDelivery[] = [...agg.entries()]
        .map(([uid, v]) => ({
          userId: uid === "__none__" ? null : uid,
          name: uid === "__none__" ? "Não atribuído" : names.get(uid) || "Usuário",
          items: v.items,
          points: v.points,
          pctItems: doneTasks > 0 ? Math.round((v.items / doneTasks) * 100) : 0,
          pctPoints: donePoints > 0 ? Math.round((v.points / donePoints) * 100) : 0,
        }))
        .sort((a, b) => b.items - a.items || b.points - a.points);

      return {
        totalTasks,
        doneTasks,
        totalPoints,
        donePoints,
        pctItems: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        pctPoints: totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0,
        byDev,
      };
    },
  });
}

/** Técnicos/desenvolvedores da organização para atribuição de crédito. */
export function useOrgTechnicians() {
  return useQuery({
    queryKey: ["org-technicians-credit"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_org_technicians");
      if (error) throw error;
      return ((data as any[]) || []).map((t) => ({ user_id: t.user_id as string, full_name: t.full_name as string }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
