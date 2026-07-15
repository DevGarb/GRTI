import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TicketDetailModal from "@/components/TicketDetailModal";
import ChamadosTabs from "@/components/chamados/ChamadosTabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import type { Ticket } from "@/hooks/useTickets";

function colorFor(status: string, _dueDate: string | null, reworkCount = 0) {
  // Concluído/resolvido: verde
  if (status === "Fechado" || status === "Aprovado" || status === "Aguardando Aprovação")
    return "bg-emerald-500/35 border-emerald-500/60 text-emerald-900 dark:text-emerald-100";
  // Em Andamento: laranja (sendo atendido)
  if (status === "Em Andamento")
    return "bg-orange-500/35 border-orange-500/60 text-orange-900 dark:text-orange-100";
  // Aberto ou retrabalho pendente: vermelho (precisa agir)
  if (status === "Aberto" || reworkCount > 0)
    return "bg-red-500/35 border-red-500/60 text-red-900 dark:text-red-100";
  return "bg-blue-500/35 border-blue-500/60 text-blue-900 dark:text-blue-100";
}

export default function ChamadosCalendario() {
  const { user, profile, hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin");
  const orgId = profile?.organization_id;

  const [cursor, setCursor] = useState<Date>(new Date());
  const [filterUser, setFilterUser] = useState<string>(isAdmin ? "all" : (user?.id || ""));
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [dayModal, setDayModal] = useState<{ date: Date; tickets: Ticket[] } | null>(null);

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-calendar", orgId, filterUser, cursor.toISOString().slice(0, 7)],
    queryFn: async () => {
      const from = format(startOfMonth(cursor), "yyyy-MM-dd");
      const to = format(endOfMonth(cursor), "yyyy-MM-dd");
      let q = supabase
        .from("tickets")
        .select("*")
        .not("due_date", "is", null)
        .gte("due_date", from)
        .lte("due_date", to);
      if (orgId) q = q.eq("organization_id", orgId);
      if (filterUser && filterUser !== "all") q = q.eq("assigned_to", filterUser);
      const { data, error } = await q;
      if (error) throw error;

      const ids = [...new Set([
        ...data.map((t: any) => t.assigned_to).filter(Boolean),
        ...data.map((t: any) => t.created_by),
      ])] as string[];
      const ticketIds = data.map((t: any) => t.id);
      const [{ data: profs }, { data: reworkHistory }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", ids),
        ticketIds.length
          ? supabase.from("ticket_history").select("ticket_id").in("ticket_id", ticketIds).eq("action", "rework")
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const m = new Map((profs || []).map((p) => [p.user_id, p.full_name]));
      const reworkMap = new Map<string, number>();
      (reworkHistory || []).forEach((h: any) => {
        reworkMap.set(h.ticket_id, (reworkMap.get(h.ticket_id) || 0) + 1);
      });
      return data.map((t: any) => ({
        ...t,
        reworkCount: reworkMap.get(t.id) || 0,
        assignedProfile: t.assigned_to ? { full_name: m.get(t.assigned_to) || "" } : null,
        creatorProfile: { full_name: m.get(t.created_by) || "" },
      })) as Ticket[];
    },
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["calendar-techs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_org_technicians");
      if (error) throw error;
      return data || [];
    },
  });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const t of tickets) {
      if (!t.due_date) continue;
      const k = t.due_date;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return map;
  }, [tickets]);

  return (
    <div className="space-y-4 max-w-7xl">
      <ChamadosTabs />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendário de Chamados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Demandas por data de entrega — clique em um card para abrir o chamado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Users className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value="all">Todos os técnicos</option>
                {technicians.map((t: any) => (
                  <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                ))}
              </select>
            </>
          )}
          <Button size="icon" variant="outline" onClick={() => setCursor(addMonths(cursor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-medium capitalize w-40 text-center">
            {format(cursor, "MMMM yyyy", { locale: ptBR })}
          </div>
          <Button size="icon" variant="outline" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" />Aguardando Aprovação/Aprovado/Fechado</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" />Aberto / Retrabalho</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500" />Em Andamento</span>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="bg-muted/50 px-2 py-1.5 text-[11px] font-medium text-center">{d}</div>
        ))}
        {days.map((day) => {
          const k = format(day, "yyyy-MM-dd");
          const dayItems = byDay.get(k) || [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={k}
              className={cn(
                "bg-card min-h-[110px] p-1.5 text-xs",
                !inMonth && "opacity-40",
                isToday && "ring-2 ring-primary ring-inset"
              )}
            >
              <div className="text-[10px] text-muted-foreground mb-1">{format(day, "d")}</div>
              <div className="space-y-1">
                {dayItems.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    title={`${t.title} — ${t.priority}${t.assignedProfile?.full_name ? ` · ${t.assignedProfile.full_name}` : ""}`}
                    className={cn(
                      "w-full text-left px-1.5 py-0.5 rounded border text-[10px] truncate hover:opacity-80 transition-opacity",
                      colorFor(t.status, t.due_date, t.reworkCount)
                    )}
                  >
                    {t.title}
                  </button>
                ))}
                {dayItems.length > 4 && (
                  <button
                    onClick={() => setDayModal({ date: day, tickets: dayItems })}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    +{dayItems.length - 4} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      <Dialog open={!!dayModal} onOpenChange={(o) => !o && setDayModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Chamados em {dayModal && format(dayModal.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {dayModal?.tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setDayModal(null);
                  setSelectedTicket(t);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg border hover:opacity-80 transition-opacity",
                  colorFor(t.status, t.due_date, t.reworkCount)
                )}
              >
                <div className="text-sm font-medium truncate">{t.title}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                  {t.assignedProfile?.full_name && (
                    <span className="text-[11px] opacity-80">· {t.assignedProfile.full_name}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
