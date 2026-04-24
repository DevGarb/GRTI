import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SprintHistoryEntry {
  id: string;
  sprint_id: string;
  project_id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: any;
  new_value: any;
  context: string | null;
  created_at: string;
  userName?: string | null;
}

export function useSprintHistory(sprintId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!sprintId) return;
    const ch = supabase
      .channel(`sprint-history-${sprintId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sprint_planning_history", filter: `sprint_id=eq.${sprintId}` },
        () => qc.invalidateQueries({ queryKey: ["sprint-history", sprintId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sprintId, qc]);

  return useQuery({
    queryKey: ["sprint-history", sprintId],
    queryFn: async () => {
      if (!sprintId) return [] as SprintHistoryEntry[];
      const { data, error } = await supabase
        .from("sprint_planning_history")
        .select("*")
        .eq("sprint_id", sprintId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data || []) as any[];
      const ids = [...new Set(rows.map((r) => r.user_id))];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids)
        : { data: [] as any[] };
      const map = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      return rows.map((r) => ({ ...r, userName: map.get(r.user_id) || null })) as SprintHistoryEntry[];
    },
    enabled: !!sprintId,
  });
}
