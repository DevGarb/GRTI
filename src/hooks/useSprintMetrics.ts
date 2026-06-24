import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

export interface SprintMetrics {
  totalPoints: number;
  completedPoints: number;
  burndown: BurndownPoint[];
  velocity: { sprint: string; points: number }[];
  avgVelocity: number;
  reworks: number;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useSprintMetrics(sprintId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: ["sprint-metrics", sprintId],
    enabled: !!sprintId,
    queryFn: async (): Promise<SprintMetrics> => {
      const { data: sprint } = await supabase
        .from("sprints")
        .select("id, start_date, end_date, project_id")
        .eq("id", sprintId!)
        .maybeSingle();
      if (!sprint) {
        return { totalPoints: 0, completedPoints: 0, burndown: [], velocity: [], avgVelocity: 0, reworks: 0 };
      }

      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("id, story_points, status, rework_count, delivered_date")
        .eq("sprint_id", sprintId!);

      const taskList = (tasks || []) as any[];
      const totalPoints = taskList.reduce((s, t) => s + (t.story_points || 0), 0);
      const completedPoints = taskList
        .filter((t) => t.status === "Concluído")
        .reduce((s, t) => s + (t.story_points || 0), 0);
      const reworks = taskList.reduce((s, t) => s + (t.rework_count || 0), 0);

      // Burndown
      const start = sprint.start_date ? new Date(sprint.start_date) : new Date();
      const end = sprint.end_date ? new Date(sprint.end_date) : new Date();
      const days: Date[] = [];
      const cur = new Date(start);
      while (cur <= end) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      const totalDays = Math.max(days.length - 1, 1);
      const today = new Date();

      const burndown: BurndownPoint[] = days.map((d, i) => {
        const dayStr = isoDay(d);
        const ideal = Math.round(totalPoints * (1 - i / totalDays) * 10) / 10;
        let actual: number | null = totalPoints;
        if (d <= today) {
          const doneByDay = taskList
            .filter((t) => t.status === "Concluído" && t.delivered_date && t.delivered_date <= dayStr)
            .reduce((s, t) => s + (t.story_points || 0), 0);
          actual = totalPoints - doneByDay;
        } else {
          actual = null as any;
        }
        return { date: dayStr.slice(5), ideal, actual: actual as number };
      });

      // Velocity (past concluded sprints from same project)
      let velocity: { sprint: string; points: number }[] = [];
      const pid = projectId || sprint.project_id;
      if (pid) {
        const { data: past } = await supabase
          .from("sprints")
          .select("id, name, closed_at")
          .eq("project_id", pid)
          .eq("status", "concluida")
          .order("closed_at", { ascending: true })
          .limit(8);
        const pastIds = (past || []).map((s: any) => s.id);
        if (pastIds.length) {
          const { data: pastTasks } = await supabase
            .from("project_tasks")
            .select("sprint_id, story_points, status")
            .in("sprint_id", pastIds);
          velocity = (past || []).map((s: any) => ({
            sprint: s.name,
            points: (pastTasks || [])
              .filter((t: any) => t.sprint_id === s.id && t.status === "Concluído")
              .reduce((sum: number, t: any) => sum + (t.story_points || 0), 0),
          }));
        }
      }
      const avgVelocity =
        velocity.length > 0 ? Math.round(velocity.reduce((s, v) => s + v.points, 0) / velocity.length) : 0;

      return { totalPoints, completedPoints, burndown, velocity, avgVelocity, reworks };
    },
  });
}
