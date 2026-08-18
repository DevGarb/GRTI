import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaskStatusAuthor {
  name: string | null;
  status: string;
  changed_at: string;
}

/** Último autor de mudança de status por tarefa. */
export function useTaskStatusAuthors(taskIds: string[]) {
  const ids = [...new Set(taskIds)].sort();
  return useQuery({
    queryKey: ["task-status-authors", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const map = new Map<string, TaskStatusAuthor>();
      const { data, error } = await supabase
        .from("task_status_history")
        .select("task_id, new_status, changed_by, changed_at")
        .in("task_id", ids)
        .order("changed_at", { ascending: true });
      if (error) throw error;
      const rows = (data || []) as any[];
      const userIds = [...new Set(rows.map((r) => r.changed_by).filter(Boolean))] as string[];
      let nameOf = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        nameOf = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      }
      for (const r of rows) {
        map.set(r.task_id, {
          name: r.changed_by ? nameOf.get(r.changed_by) ?? null : null,
          status: r.new_status,
          changed_at: r.changed_at,
        });
      }
      return map;
    },
  });
}
