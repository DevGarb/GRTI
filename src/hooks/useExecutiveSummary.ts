import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExecutiveOverview {
  backlog_total: number;
  open_count: number;
  in_progress_count: number;
  awaiting_approval_count: number;
  active_technicians: number;
}

export function useExecutiveOverview(organizationId?: string | null) {
  return useQuery({
    queryKey: ["executive-overview", organizationId ?? null],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_executive_overview" as any, {
        _organization_id: organizationId!,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? {
        backlog_total: 0,
        open_count: 0,
        in_progress_count: 0,
        awaiting_approval_count: 0,
        active_technicians: 0,
      }) as ExecutiveOverview;
    },
  });
}

export interface DailyInsightsResult {
  insights: string[];
  highlights: string[];
  risks: string[];
  technician_summaries: Record<string, string>;
  whatsapp_message: string;
  op_status: "normal" | "attention" | "critical";
  cached: boolean;
}

export function useDailyInsights(params: {
  organizationId?: string | null;
  from: Date;
  to: Date;
  enabled?: boolean;
}) {
  const { organizationId, from, to, enabled = true } = params;
  return useQuery({
    queryKey: ["daily-insights", organizationId, from.toISOString(), to.toISOString()],
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-executive-summary", {
        body: {
          organization_id: organizationId,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      });
      if (error) throw error;
      return data as DailyInsightsResult;
    },
  });
}

export async function regenerateDailyInsights(params: {
  organizationId: string;
  from: Date;
  to: Date;
}) {
  const { data, error } = await supabase.functions.invoke("generate-executive-summary", {
    body: {
      organization_id: params.organizationId,
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      force: true,
    },
  });
  if (error) throw error;
  return data as DailyInsightsResult;
}
