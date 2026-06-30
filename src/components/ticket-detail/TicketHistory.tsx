import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDateBR, formatTimeBR } from "@/lib/dateFormat";

interface Props {
  ticketId: string;
  createdAt: string;
}

export default function TicketHistory({ ticketId, createdAt }: Props) {
  const { data: history = [] } = useQuery({
    queryKey: ["ticket-history", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_history")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data.map((h) => h.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds.length ? userIds : ["_"]);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      return data.map((h) => ({
        ...h,
        user_name: profileMap.get(h.user_id) || "Sistema",
      }));
    },
  });

  const actionLabels: Record<string, string> = {
    status_change: "Alterou status",
    created: "Criação",
    assigned: "Atribuído",
    started: "Iniciou atendimento",
    approved: "Aprovado",
    evaluated: "Avaliado",
    rework: "Retrabalhado",
    rework_invalidated: "Retrabalho invalidado",
    rework_removed: "Não retrabalho validado",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Clock className="h-3.5 w-3.5" />
        Histórico
      </div>

      <div className="space-y-2">
        {history.map((h) => (
          <div key={h.id} className="flex items-start gap-2 text-sm">
            <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
            <div>
              <span className="font-medium text-foreground">
                {actionLabels[h.action] || h.action}
              </span>
              {h.new_value && (
                <span className="text-muted-foreground">
                  {h.old_value ? ` de "${h.old_value}" para "${h.new_value}"` : `: ${h.new_value}`}
                </span>
              )}
              {h.user_name && (
                <span className="text-muted-foreground"> — {h.user_name}</span>
              )}
              <p className="text-[11px] text-muted-foreground">
                {formatDateBR(h.created_at)},{" "}
                {formatTimeBR(h.created_at)}
              </p>
            </div>
          </div>
        ))}

        {/* Creation entry (always present) */}
        <div className="flex items-start gap-2 text-sm">
          <div className="mt-1.5 h-2 w-2 rounded-full bg-muted-foreground shrink-0" />
          <div>
            <span className="font-medium text-foreground">Criação</span>
            <p className="text-[11px] text-muted-foreground">
              {formatDateBR(createdAt)},{" "}
              {formatTimeBR(createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
