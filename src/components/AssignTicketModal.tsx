import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, HandMetal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dispatchWebhookEvent } from "@/hooks/useWebhooks";
import { useTechnicianProfiles } from "@/hooks/useTickets";

interface Props {
  ticketId: string;
  currentAssignee?: string | null;
  mode?: "self" | "admin"; // self = técnico se atribuindo; admin = admin escolhe técnico
  onClose: () => void;
  onAssigned?: () => void;
}

export default function AssignTicketModal({ ticketId, currentAssignee, mode = "self", onClose, onAssigned }: Props) {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const { data: technicians = [] } = useTechnicianProfiles();
  const isAdmin = hasRole("admin") || hasRole("super_admin");

  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assigneeId, setAssigneeId] = useState<string>(
    mode === "self" ? (user?.id || "") : (currentAssignee || "")
  );
  const [saving, setSaving] = useState(false);

  const canSubmit = !!assigneeId && !!dueDate && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const updates: any = {
        assigned_to: assigneeId,
        due_date: format(dueDate!, "yyyy-MM-dd"),
        due_date_set_by: user!.id,
        due_date_set_at: nowIso,
      };
      // Mantém status como "Aberto" — não muda automaticamente para "Em Andamento"
      // Apenas grava o momento da atribuição
      if (!currentAssignee) {
        updates.picked_at = nowIso;
      }

      const { error } = await supabase.from("tickets").update(updates).eq("id", ticketId);
      if (error) throw error;

      const assignedProfile = technicians.find((t: any) => t.user_id === assigneeId);
      await supabase.from("ticket_history").insert({
        ticket_id: ticketId,
        user_id: user!.id,
        action: mode === "self" ? "picked" : "assigned_change",
        old_value: currentAssignee ? "" : "Não atribuído",
        new_value: assignedProfile?.full_name || "Técnico",
      });

      dispatchWebhookEvent(ticketId, "ticket_assigned");
      supabase.functions
        .invoke("send-whatsapp", { body: { ticket_id: ticketId, event_type: "assigned" } })
        .catch(() => {});

      toast.success("Chamado atribuído com data de entrega definida.");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["open-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets-calendar"] });
      onAssigned?.();
      onClose();
    } catch (e: any) {
      toast.error("Erro ao atribuir: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <HandMetal className="h-5 w-5 text-emerald-600" />
              Atribuir chamado
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Defina o responsável e a data de entrega prevista.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mode === "admin" && isAdmin ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Técnico responsável</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option value="">Selecione um técnico…</option>
                {technicians.map((t: any) => (
                  <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-sm text-foreground">
              Você assumirá este chamado como responsável.
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data de entrega *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "mt-1 w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : "Selecionar data…"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  disabled={(d) => d < new Date(new Date().toDateString())}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground mt-1">
              O chamado permanece como <b>Aberto</b> até você iniciar o atendimento.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/20 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Atribuindo…" : "Confirmar atribuição"}
          </button>
        </div>
      </div>
    </div>
  );
}
