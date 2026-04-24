import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SprintMetric {
  sprint_id: string;
  project_id: string;
  planned_points: number;
  planned_tickets: number;
  planned_tasks: number;
  delivered_points: number;
  delivered_tickets: number;
  delivered_tasks: number;
  scope_added_points: number;
  scope_removed_points: number;
  efficiency_pct: number | null;
  scope_change_pct: number | null;
  predictability_pct: number | null;
  capacity_at_close: number | null;
  closed_at: string | null;
  sprintName?: string;
}

export function useProjectSprintMetrics(projectId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const ch = supabase
      .channel(`sprint-metrics-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sprint_metrics", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: ["sprint-metrics", projectId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId, qc]);

  return useQuery({
    queryKey: ["sprint-metrics", projectId],
    queryFn: async () => {
      if (!projectId) return [] as SprintMetric[];
      const { data, error } = await supabase
        .from("sprint_metrics")
        .select("*")
        .eq("project_id", projectId)
        .order("closed_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      const rows = (data || []) as any[];
      const ids = rows.map((r) => r.sprint_id);
      const { data: sprints } = ids.length
        ? await supabase.from("sprints").select("id, name").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((sprints || []).map((s: any) => [s.id, s.name]));
      return rows.map((r) => ({ ...r, sprintName: map.get(r.sprint_id) || "—" })) as SprintMetric[];
    },
    enabled: !!projectId,
  });
}
