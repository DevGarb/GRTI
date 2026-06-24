import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isBefore, startOfDay, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TicketDetailModal from "@/components/TicketDetailModal";
import ChamadosTabs from "@/components/chamados/ChamadosTabs";
import type { Ticket } from "@/hooks/useTickets";

export default function ChamadosCalendario() {
  const { user, profile, hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin");
  const orgId = profile?.organization_id;

  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [filterUser, setFilterUser] = useState<string>(isAdmin ? "all" : (user?.id || ""));
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-calendar", orgId, filterUser, month.toISOString().slice(0, 7)],
    queryFn: async () => {
      const from = format(startOfMonth(month), "yyyy-MM-dd");
      const to = format(endOfMonth(month), "yyyy-MM-dd");
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
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const m = new Map((profs || []).map((p) => [p.user_id, p.full_name]));
      return data.map((t: any) => ({
        ...t,
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

  const ticketsByDay = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const t of tickets) {
      if (!t.due_date) continue;
      const key = t.due_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tickets]);

  const dayList = selectedDay
    ? ticketsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  const today = startOfDay(new Date());

  return (
    <div className="space-y-4 max-w-7xl">
      <ChamadosTabs />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" /> Calendário de Entregas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Demandas por data de entrega definida no momento da atribuição.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-6">
        <div className="card-elevated p-3">
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            month={month}
            onMonthChange={setMonth}
            locale={ptBR}
            className="pointer-events-auto"
            modifiers={{
              hasTickets: (d) => ticketsByDay.has(format(d, "yyyy-MM-dd")),
              overdue: (d) =>
                isBefore(d, today) &&
                (ticketsByDay.get(format(d, "yyyy-MM-dd")) || []).some(
                  (t) => t.status !== "Fechado" && t.status !== "Aprovado"
                ),
            }}
            modifiersClassNames={{
              hasTickets: "bg-primary/15 text-primary font-semibold rounded-md",
              overdue: "bg-red-500/20 text-red-700 dark:text-red-400 font-semibold rounded-md",
            }}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            {selectedDay
              ? `Chamados com entrega em ${format(selectedDay, "PPP", { locale: ptBR })}`
              : "Selecione um dia"}
            <span className="ml-2 text-xs text-muted-foreground">({dayList.length})</span>
          </h2>

          {dayList.length === 0 ? (
            <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
              Nenhum chamado com entrega para esta data.
            </div>
          ) : (
            <div className="card-elevated divide-y divide-border overflow-hidden">
              {dayList.map((t) => {
                const overdue =
                  selectedDay &&
                  isBefore(startOfDay(new Date(t.due_date!)), today) &&
                  t.status !== "Fechado" &&
                  t.status !== "Aprovado";
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusBadge status={t.status} />
                          <PriorityBadge priority={t.priority} />
                          {t.assignedProfile?.full_name && (
                            <span className="text-xs text-muted-foreground">
                              Técnico: {t.assignedProfile.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                      {overdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-400 text-[11px] font-semibold">
                          <AlertTriangle className="h-3 w-3" /> Vencido
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}
