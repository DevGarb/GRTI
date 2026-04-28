import { useState } from "react";
import { Clock, HandMetal, Search } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { usePickTicket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import TicketDetailModal from "@/components/TicketDetailModal";
import type { Ticket } from "@/hooks/useTickets";

export default function ChamadosAbertos() {
  const { profile, user } = useAuth();
  const orgId = profile?.organization_id;
  const pickTicket = usePickTicket();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchText, setSearchText] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["open-tickets", orgId],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("*")
        .in("status", ["Aberto", "Disponível"])
        .order("created_at", { ascending: false });

      if (orgId) {
        query = query.eq("organization_id", orgId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set([
        ...data.map(t => t.assigned_to).filter(Boolean),
        ...data.map(t => t.created_by),
      ])] as string[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      return data.map(t => ({
        ...t,
        assignedProfile: t.assigned_to ? { full_name: profileMap.get(t.assigned_to) || "" } : null,
        creatorProfile: { full_name: profileMap.get(t.created_by) || "" },
        reworkCount: 0,
      })) as Ticket[];
    },
  });

  const filtered = tickets
    .filter(t =>
      t.title.toLowerCase().includes(searchText.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (t.creatorProfile?.full_name || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (t.assignedProfile?.full_name || "").toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => {
      const aExpired = a.status === "Disponível" ? 0 : 1;
      const bExpired = b.status === "Disponível" ? 0 : 1;
      if (aExpired !== bExpired) return aExpired - bExpired;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chamados em Aberto</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chamados aguardando atendimento — clique em "Atribuir para mim" para assumir
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por título, descrição ou solicitante..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated p-12 flex flex-col items-center justify-center gap-2">
          <Clock className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum chamado em aberto no momento.</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden border-2 border-amber-300 dark:border-amber-700">
          <div className="px-4 py-3 border-b border-border bg-amber-50 dark:bg-amber-950/30 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {filtered.length} chamado{filtered.length !== 1 ? "s" : ""} em aberto
              </h2>
            </div>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                  <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                    <span className="text-xs text-muted-foreground">
                      Solicitante: {ticket.creatorProfile?.full_name || "—"}
                    </span>
                    {ticket.assignedProfile?.full_name && (
                      <span className="text-xs text-muted-foreground">
                        • Técnico: {ticket.assignedProfile.full_name}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => pickTicket.mutate(ticket.id)}
                  disabled={pickTicket.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
                >
                  <HandMetal className="h-4 w-4" />
                  Atribuir para mim
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  );
}
