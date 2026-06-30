import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface TmaAnomaly {
  id: string;
  ticket_id: string;
  assigned_to: string | null;
  organization_id: string | null;
  anomaly_type: string;
  severity: "baixa" | "media" | "alta" | "critica";
  details: Record<string, any>;
  detected_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  dismissed: boolean;
  notes: string | null;
  ticket?: { title: string; status: string; closed_at: string | null } | null;
  technician?: { full_name: string } | null;
}

export const ANOMALY_LABELS: Record<string, string> = {
  missing_em_andamento: "Sem evento 'Em Andamento'",
  missing_close_event: "Sem evento de encerramento",
  inflated_window: "Janela bruta inflada",
  started_after_closed: "Início posterior ao fechamento",
  assigned_without_started: "Atribuído sem iniciar",
  long_open_no_activity: "Sem atividade há +7 dias",
};

export const SEVERITY_ORDER: Record<string, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

export function useTmaAnomalies(opts?: { includeResolved?: boolean }) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["tma-anomalies", profile?.organization_id, opts?.includeResolved ?? false],
    queryFn: async () => {
      let q = supabase
        .from("ticket_tma_anomalies")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(500);
      if (!opts?.includeResolved) {
        q = q.is("reviewed_at", null).eq("dismissed", false);
      }
      const { data, error } = await q;
      if (error) throw error;

      const ticketIds = [...new Set((data || []).map((a) => a.ticket_id))];
      const userIds = [...new Set((data || []).map((a) => a.assigned_to).filter(Boolean))] as string[];

      const [{ data: tickets }, { data: profiles }] = await Promise.all([
        ticketIds.length
          ? supabase.from("tickets").select("id, title, status, closed_at").in("id", ticketIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const tMap = new Map((tickets || []).map((t: any) => [t.id, t]));
      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      return (data || []).map((a: any) => ({
        ...a,
        ticket: tMap.get(a.ticket_id) || null,
        technician: a.assigned_to ? { full_name: pMap.get(a.assigned_to) || "—" } : null,
      })) as TmaAnomaly[];
    },
  });
}

export function useReviewAnomaly() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, dismissed, notes }: { id: string; dismissed?: boolean; notes?: string }) => {
      const patch: any = {
        reviewed_at: new Date().toISOString(),
        reviewed_by: user!.id,
      };
      if (dismissed) patch.dismissed = true;
      if (notes !== undefined) patch.notes = notes;
      const { error } = await supabase.from("ticket_tma_anomalies").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tma-anomalies"] });
      toast.success("Anomalia atualizada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useRunAnomalyDetection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lookbackDays = 60) => {
      const { data, error } = await supabase.rpc("detect_tma_anomalies", { _lookback_days: lookbackDays });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tma-anomalies"] });
      toast.success("Varredura concluída");
    },
    onError: (e: Error) => toast.error("Erro na varredura: " + e.message),
  });
}
