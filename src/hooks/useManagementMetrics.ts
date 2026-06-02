import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ManagementMetricRow {
  user_id: string;
  full_name: string;
  closed_in_period: number;
  in_progress_now: number;
  total_assigned: number;
  awaiting_approval: number;
  points: number;
  rework_count: number;
  rework_percent: number;
  avg_csat: number;
  csat_count: number;
  avg_handle_minutes: number;
}

export function useManagementMetrics(from: Date, to: Date, organizationId?: string | null) {
  return useQuery({
    queryKey: ["management-metrics", from.toISOString(), to.toISOString(), organizationId ?? null],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_management_metrics" as any, {
        _from: from.toISOString(),
        _to: to.toISOString(),
        _organization_id: organizationId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as ManagementMetricRow[];
    },
  });
}

export interface ManagementReportConfig {
  id: string;
  organization_id: string;
  webhook_url: string | null;
  send_time: string;
  timezone: string;
  is_active: boolean;
  last_sent_at: string | null;
}

export function useManagementReportConfig(organizationId?: string | null) {
  return useQuery({
    queryKey: ["management-report-config", organizationId ?? null],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("management_report_config" as any)
        .select("*")
        .eq("organization_id", organizationId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as ManagementReportConfig | null;
    },
  });
}
