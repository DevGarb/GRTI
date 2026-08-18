import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DevDelivery {
  userId: string | null;
  name: string;
  items: number;
  points: number;
  pctItems: number;
  pctPoints: number;
  /** Itens dessa pessoa atualmente em "Em Desenvolvimento". */
  inProgress: number;
  /** Data (ISO) da última conclusão creditada. */
  lastDeliveryAt: string | null;
  /** Média de dias entre entrar em desenvolvimento e concluir. */
  avgLeadDays: number | null;
}

export interface ProjectDelivery {
  totalTasks: number;
  doneTasks: number;
  inDevTasks: number;
  pendingTasks: number;
  totalPoints: number;
  donePoints: number;
  pctItems: number;
  pctPoints: number;
  byDev: DevDelivery[];
}

const DONE = "Concluído";
const IN_DEV = "Em Desenvolvimento";

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

const EMPTY: ProjectDelivery = {
  totalTasks: 0,
  doneTasks: 0,
  inDevTasks: 0,
  pendingTasks: 0,
  totalPoints: 0,
  donePoints: 0,
  pctItems: 0,
  pctPoints: 0,
  byDev: [],
};

/**
 * Progresso do projeto (itens e pontos) e indicadores por desenvolvedor.
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
      if (tasks.length === 0) return EMPTY;

      const totalTasks = tasks.length;
      const totalPoints = tasks.reduce((s, t) => s + (t.story_points || 0), 0);
      const doneList = tasks.filter((t) => t.status === DONE);
      const devList = tasks.filter((t) => t.status === IN_DEV);
      const doneTasks = doneList.length;
      const donePoints = doneList.reduce((s, t) => s + (t.story_points || 0), 0);

      // Histórico de status de todas as tarefas do projeto
      const closerOf = new Map<string, string>();
      const doneAt = new Map<string, string>();
      const devStartAt = new Map<string, string>();
      const devMoverOf = new Map<string, string>();
      const { data: hist } = await supabase
        .from("task_status_history")
        .select("task_id, new_status, changed_by, changed_at")
        .in("task_id", tasks.map((t) => t.id))
        .in("new_status", [DONE, IN_DEV])
        .order("changed_at", { ascending: true });
      for (const h of ((hist as any[]) || [])) {
        if (h.new_status === DONE) {
          if (h.changed_by) closerOf.set(h.task_id, h.changed_by);
          doneAt.set(h.task_id, h.changed_at);
        } else {
          if (!devStartAt.has(h.task_id)) devStartAt.set(h.task_id, h.changed_at);
          if (h.changed_by) devMoverOf.set(h.task_id, h.changed_by);
        }
      }

      type Acc = {
        items: number;
        points: number;
        inProgress: number;
        lastDeliveryAt: string | null;
        leadDays: number[];
      };
      const agg = new Map<string, Acc>();
      const get = (uid: string) => {
        const cur = agg.get(uid) || { items: 0, points: 0, inProgress: 0, lastDeliveryAt: null, leadDays: [] };
        agg.set(uid, cur);
        return cur;
      };

      for (const t of doneList) {
        const uid: string = t.credited_to || closerOf.get(t.id) || t.assignee_id || "__none__";
        const cur = get(uid);
        cur.items += 1;
        cur.points += t.story_points || 0;
        const d = doneAt.get(t.id) || null;
        if (d && (!cur.lastDeliveryAt || d > cur.lastDeliveryAt)) cur.lastDeliveryAt = d;
        const start = devStartAt.get(t.id);
        if (d && start) {
          const days = (new Date(d).getTime() - new Date(start).getTime()) / 86400000;
          if (days >= 0) cur.leadDays.push(days);
        }
      }

      for (const t of devList) {
        const uid: string = t.credited_to || devMoverOf.get(t.id) || t.assignee_id || "__none__";
        get(uid).inProgress += 1;
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
          inProgress: v.inProgress,
          lastDeliveryAt: v.lastDeliveryAt,
          avgLeadDays:
            v.leadDays.length > 0
              ? Math.round((v.leadDays.reduce((s, d) => s + d, 0) / v.leadDays.length) * 10) / 10
              : null,
        }))
        .sort((a, b) => b.items - a.items || b.points - a.points);

      return {
        totalTasks,
        doneTasks,
        inDevTasks: devList.length,
        pendingTasks: totalTasks - doneTasks - devList.length,
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
