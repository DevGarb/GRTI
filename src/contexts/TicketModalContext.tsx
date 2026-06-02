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
    supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          toast.error("Chamado não encontrado");
          setTicketId(null);
        } else {
          setTicket(data as Ticket);
        }
        setLoading(false);
      });
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
