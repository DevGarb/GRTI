import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Ticket } from "@/hooks/useTickets";
import TicketDetailModal from "@/components/TicketDetailModal";
import { toast } from "sonner";

interface TicketModalContextValue {
  openTicket: (ticketId: string) => void;
  closeTicket: () => void;
}

const TicketModalContext = createContext<TicketModalContextValue | undefined>(undefined);

export function TicketModalProvider({ children }: { children: ReactNode }) {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!ticketId) {
      setTicket(null);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error("Chamado não encontrado");
        setTicketId(null);
        setLoading(false);
        return;
      }
      const userIds = [
        ...new Set([data.assigned_to, data.created_by].filter(Boolean)),
      ] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
      setTicket({
        ...data,
        assignedProfile: data.assigned_to ? { full_name: profileMap.get(data.assigned_to) || "" } : null,
        creatorProfile: { full_name: profileMap.get(data.created_by) || "" },
        reworkCount: (data as any).rework_count ?? 0,
      } as Ticket);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  const openTicket = useCallback((id: string) => setTicketId(id), []);
  const closeTicket = useCallback(() => setTicketId(null), []);

  return (
    <TicketModalContext.Provider value={{ openTicket, closeTicket }}>
      {children}
      {ticket && <TicketDetailModal ticket={ticket} onClose={closeTicket} />}
    </TicketModalContext.Provider>
  );
}

export function useTicketModal() {
  const ctx = useContext(TicketModalContext);
  if (!ctx) throw new Error("useTicketModal must be used within TicketModalProvider");
  return ctx;
}

// Force a full page reload on HMR updates so the Context identity stays in sync
// between <TicketModalProvider> and consumers (avoids "must be used within" errors).
if (import.meta.hot) {
  import.meta.hot.invalidate();
}
