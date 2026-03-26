import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { dispatchWebhookEvent } from "@/hooks/useWebhooks";

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  type: string;
  status: string;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
  category_id: string | null;
  sla_deadline: string | null;
  started_at: string | null;
  picked_at: string | null;
  original_assigned_to: string | null;
  reworkCount?: number;
  // joined
  assignedProfile?: { full_name: string } | null;
  creatorProfile?: { full_name: string } | null;
}

export function useTickets() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["tickets", orgId],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (orgId) {
        query = query.eq("organization_id", orgId);
      }
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles for assigned_to and created_by
      const userIds = [...new Set([
        ...data.map(t => t.assigned_to).filter(Boolean),
        ...data.map(t => t.created_by),
      ])] as string[];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      // Fetch rework counts from ticket_history
      const ticketIds = data.map(t => t.id);
      let reworkMap = new Map<string, number>();
      if (ticketIds.length > 0) {
        const { data: reworkHistory } = await supabase
          .from("ticket_history")
          .select("ticket_id")
          .in("ticket_id", ticketIds)
          .eq("action", "rework");
        if (reworkHistory) {
          reworkHistory.forEach(h => {
            reworkMap.set(h.ticket_id, (reworkMap.get(h.ticket_id) || 0) + 1);
          });
        }
      }
      
      return data.map(t => ({
        ...t,
        assignedProfile: t.assigned_to ? { full_name: profileMap.get(t.assigned_to) || "" } : null,
        creatorProfile: { full_name: profileMap.get(t.created_by) || "" },
        reworkCount: reworkMap.get(t.id) || 0,
      })) as Ticket[];
    },
  });
}

interface CreateTicketInput {
  title: string;
  description: string;
  priority: string;
  type: string;
  assigned_to?: string | null;
  sector?: string | null;
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          ...input,
          created_by: user!.id,
          organization_id: profile?.organization_id ?? null,
          status: "Aberto",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Chamado criado com sucesso!");
      if (data?.id) dispatchWebhookEvent(data.id, "ticket_created");
    },
    onError: (e: Error) => {
      toast.error("Erro ao criar chamado: " + e.message);
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ticket> & { id: string }) => {
      const { data, error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Chamado atualizado!");
    },
    onError: (e: Error) => {
      toast.error("Erro ao atualizar: " + e.message);
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Chamado excluído!");
    },
    onError: (e: Error) => {
      toast.error("Erro ao excluir: " + e.message);
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });
}
