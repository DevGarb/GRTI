import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingApprovalTicket {
  id: string;
  title: string;
  aguardando_aprovacao_at: string | null;
  created_at: string;
}

export function usePendingApprovalTickets() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["pending-approval-tickets", userId],
    queryFn: async (): Promise<PendingApprovalTicket[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("id, title, aguardando_aprovacao_at, created_at")
        .eq("created_by", userId)
        .eq("status", "Aguardando Aprovação")
        .order("aguardando_aprovacao_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PendingApprovalTicket[];
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
  });
}
