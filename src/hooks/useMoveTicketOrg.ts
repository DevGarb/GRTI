import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useMoveTicketOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, targetOrgId }: { ticketId: string; targetOrgId: string }) => {
      const { error } = await supabase.rpc("move_ticket_to_organization", {
        _ticket_id: ticketId,
        _target_org: targetOrgId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Chamado movido para a outra organização");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao mover chamado");
    },
  });
}
