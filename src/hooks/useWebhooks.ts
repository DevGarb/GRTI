import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const WEBHOOK_EVENTS = [
  { value: "ticket_created", label: "Chamado criado" },
  { value: "ticket_assigned", label: "Técnico atribuído" },
  { value: "ticket_started", label: "Atendimento iniciado" },
  { value: "ticket_finished", label: "Aguardando aprovação" },
  { value: "ticket_approved", label: "Chamado aprovado" },
  { value: "ticket_rejected", label: "Retrabalho (reprovado)" },
  { value: "ticket_closed", label: "Chamado fechado" },
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number]["value"];

export interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useWebhooks() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["webhooks", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_webhooks" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Webhook[];
    },
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: { name: string; url: string; secret?: string; events: string[] }) => {
      const { data, error } = await supabase
        .from("organization_webhooks" as any)
        .insert({
          organization_id: profile?.organization_id,
          name: input.name,
          url: input.url,
          secret: input.secret || null,
          events: input.events,
          is_active: true,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook cadastrado com sucesso!");
    },
    onError: (e: Error) => toast.error("Erro ao cadastrar webhook: " + e.message),
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Webhook> & { id: string }) => {
      const { error } = await supabase
        .from("organization_webhooks" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook atualizado!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_webhooks" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook removido!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

/** Fire-and-forget helper to dispatch a webhook event */
export function dispatchWebhookEvent(ticketId: string, eventType: WebhookEventType, extra?: Record<string, any>) {
  supabase.functions.invoke("dispatch-webhook", {
    body: { ticket_id: ticketId, event_type: eventType, extra },
  }).catch((err) => {
    console.error("Webhook dispatch error:", err);
  });
}
