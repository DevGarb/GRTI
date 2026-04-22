import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, ChevronDown, ChevronRight, Plus, User, RefreshCw, Inbox, SendHorizonal, HandMetal, AlertTriangle, Clock, TicketCheck, CircleDot, Loader2, CheckCircle2, LayoutGrid, List, Trophy } from "lucide-react";
import KanbanBoard from "@/components/KanbanBoard";
import MonthSelector, { getCurrentMonthValue, getMonthDateRange } from "@/components/MonthSelector";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { useTickets, Ticket, usePickTicket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import NewTicketModal from "@/components/NewTicketModal";
import TicketDetailModal from "@/components/TicketDetailModal";
import { supabase } from "@/integrations/supabase/client";

const allStatuses = ["Aberto", "Em Andamento", "Aguardando Aprovação", "Aprovado", "Fechado", "Disponível"];

const statusBadgeColors: Record<string, string> = {
  "Aberto": "bg-red-500 text-white",
  "Em Andamento": "bg-yellow-500 text-white",
  "Aguardando Aprovação": "bg-purple-500 text-white",
  "Aprovado": "bg-blue-500 text-white",
  "Fechado": "bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200",
  "Disponível": "bg-red-600 text-white",
};
function TicketTable({ tickets, onSelect, scoreMap }: { tickets: Ticket[]; onSelect: (t: Ticket) => void; scoreMap?: Map<string, number> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Título</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Solicitante</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Status</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Categoria</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Data</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Prioridade</th>
            <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Pontuação</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const score = scoreMap?.get(ticket.id);
            return (
            <tr
              key={ticket.id}
              onClick={() => onSelect(ticket)}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate block max-w-[250px]">
                    {ticket.title}
                  </span>
                  {(ticket.reworkCount || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shrink-0">
                      <RefreshCw className="h-2.5 w-2.5" />
                      {ticket.reworkCount}x
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {ticket.creatorProfile?.full_name || "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{ticket.type}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td className="px-4 py-3">
                {score !== undefined && score > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Trophy className="h-3 w-3" />
                    {score} pts
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AvailableTicketsSection({ tickets, onSelect, title, description, variant = "expired" }: { tickets: Ticket[]; onSelect: (t: Ticket) => void; title?: string; description?: string; variant?: "expired" | "open" }) {
  const pickTicket = usePickTicket();

  const isExpired = variant === "expired";
  const borderColor = isExpired ? "border-red-300 dark:border-red-700" : "border-amber-300 dark:border-amber-700";
  const headerBg = isExpired ? "bg-red-50 dark:bg-red-950/30" : "bg-amber-50 dark:bg-amber-950/30";
  const iconColor = isExpired ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400";
  const titleColor = isExpired ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400";
  const descColor = isExpired ? "text-red-600/70 dark:text-red-400/70" : "text-amber-600/70 dark:text-amber-400/70";
  const HeaderIcon = isExpired ? AlertTriangle : Clock;

  return (
    <div className={`card-elevated overflow-hidden border-2 ${borderColor}`}>
      <div className={`px-4 py-3 border-b border-border ${headerBg} flex items-center gap-2`}>
        <HeaderIcon className={`h-4 w-4 ${iconColor}`} />
        <div className="flex-1">
          <h2 className={`text-sm font-semibold ${titleColor}`}>{title || "Disponíveis para assumir"}</h2>
          <p className={`text-xs ${descColor}`}>{description || `${tickets.length} chamado${tickets.length !== 1 ? 's' : ''} com SLA expirado`}</p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(ticket)}>
              <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span className="text-xs text-muted-foreground">
                  {ticket.creatorProfile?.full_name || "—"}
                </span>
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
  );
}

export default function Chamados() {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos Status");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());
  const [reworkFilter, setReworkFilter] = useState(false);
  const { data: tickets = [], isLoading } = useTickets();
  const { hasRole, roles, user } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  const { from: monthFrom, to: monthTo } = getMonthDateRange(selectedMonth);

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchText.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (t.creatorProfile?.full_name || "").toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === "Todos Status" || t.status === statusFilter;
    const d = new Date(t.created_at);
    const matchMonth = d >= monthFrom && d <= monthTo;
    const isDisponivel = t.status === "Disponível";
    const matchRework = !reworkFilter || (t.reworkCount || 0) > 0;
    return matchSearch && matchStatus && (matchMonth || isDisponivel) && matchRework;
  });

  // Pontuação: tickets fechados pelo usuário no mês selecionado (filtra por updated_at = data de fechamento)
  const closedByMe = tickets.filter((t) => {
    if (t.assigned_to !== user?.id || t.status !== "Fechado") return false;
    const d = new Date(t.updated_at);
    return d >= monthFrom && d <= monthTo;
  });
  const closedTicketIds = closedByMe.map((t) => t.id);

  const { data: myScore = 0 } = useQuery({
    queryKey: ["my-score", user?.id, selectedMonth, closedTicketIds.join(",")],
    queryFn: async () => {
      if (!user?.id || closedTicketIds.length === 0) return 0;
      // Soma dos pontos atribuídos (type="meta") nos chamados fechados pelo técnico no mês
      const { data: evals, error } = await supabase
        .from("evaluations")
        .select("score")
        .eq("type", "meta")
        .in("ticket_id", closedTicketIds);
      if (error) throw error;
      return (evals || []).reduce((sum, e) => sum + (e.score || 0), 0);
    },
    enabled: !!user?.id && !isAdmin && closedTicketIds.length > 0,
  });

  // Pontuação: apenas chamados FECHADOS que tiveram pontuação atribuída (type="meta")
  const closedFilteredIds = filtered.filter((t) => t.status === "Fechado").map((t) => t.id);
  const { data: scoreMap = new Map<string, number>() } = useQuery({
    queryKey: ["ticket-scores", closedFilteredIds.join(",")],
    queryFn: async () => {
      const map = new Map<string, number>();
      if (closedFilteredIds.length === 0) return map;
      const { data: evals, error } = await supabase
        .from("evaluations")
        .select("ticket_id, score")
        .eq("type", "meta")
        .in("ticket_id", closedFilteredIds);
      if (error) throw error;
      (evals || []).forEach((e) => {
        map.set(e.ticket_id, e.score || 0);
      });
      return map;
    },
    enabled: closedFilteredIds.length > 0,
  });

  // Group by assigned technician (or creator if not assigned)
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
    const name = t.assignedProfile?.full_name || t.creatorProfile?.full_name || "Sem atribuição";
    (acc[name] = acc[name] || []).push(t);
    return acc;
  }, {});

  // Sort groups by ticket count desc
  const sortedGroups = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Chamados</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-input bg-background p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Novo Chamado
          </button>
        </div>
      </div>

      {/* Mini-dashboard de contadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", count: filtered.length, icon: TicketCheck, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
          { label: "Abertos", count: filtered.filter(t => t.status === "Aberto").length, icon: CircleDot, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
          { label: "Em Andamento", count: filtered.filter(t => t.status === "Em Andamento").length, icon: Loader2, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
          { label: "Fechados", count: filtered.filter(t => t.status === "Fechado").length, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
        ].map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className="card-elevated p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card-elevated p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros Avançados
        </div>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por título, descrição ou solicitante..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
          >
            <option>Todos Status</option>
            {allStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          <button
            onClick={() => setReworkFilter(!reworkFilter)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              reworkFilter
                ? "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "border-input bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retrabalho
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated p-12 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Nenhum chamado encontrado.</p>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard tickets={filtered} onSelect={setSelectedTicket} />
      ) : isAdmin ? (
        /* Admin: grouped by user */
        <div className="space-y-3">
          {sortedGroups.map(([userName, userTickets]) => {
            const isExpanded = expandedUser === userName;
            const statusCounts = allStatuses.reduce<Record<string, number>>((acc, s) => {
              const count = userTickets.filter((t) => t.status === s).length;
              if (count > 0) acc[s] = count;
              return acc;
            }, {});

            return (
              <div key={userName} className="card-elevated overflow-hidden">
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : userName)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-semibold text-foreground">{userName.toUpperCase()}</span>
                    <p className="text-[12px] text-muted-foreground">{userTickets.length} chamados</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <span
                        key={status}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusBadgeColors[status] || "bg-muted text-muted-foreground"}`}
                      >
                        {status}: {count}
                      </span>
                    ))}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    <TicketTable tickets={userTickets} onSelect={setSelectedTicket} scoreMap={scoreMap} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Non-admin: split into available, assigned to me, created by me */
        (() => {
          const userId = user?.id;
          const availableTickets = filtered.filter(t => t.status === "Disponível");
              const assignedToMe = filtered.filter(t => t.assigned_to === userId && t.status !== "Disponível");
              const createdByMe = filtered.filter(t => t.created_by === userId && t.assigned_to !== userId && t.status !== "Disponível");
              return (
                <div className="space-y-4">
                  {/* Pontuação do técnico */}
                  <div className="card-elevated p-4 flex items-center gap-4 border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Minha Pontuação — {selectedMonth}</p>
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 leading-tight">{myScore} <span className="text-base font-semibold">pts</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Chamados fechados</p>
                      <p className="text-2xl font-bold text-foreground">{closedByMe.length}</p>
                    </div>
                  </div>
                  {availableTickets.length > 0 && (
                <AvailableTicketsSection
                  tickets={availableTickets}
                  onSelect={setSelectedTicket}
                  title="Disponíveis para assumir"
                  description={`${availableTickets.length} chamado${availableTickets.length !== 1 ? 's' : ''} com SLA expirado`}
                  variant="expired"
                />
              )}
              {assignedToMe.length > 0 && (
                <div className="card-elevated overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-primary" />
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Chamados atribuídos a mim</h2>
                      <p className="text-xs text-muted-foreground">{assignedToMe.length} chamado{assignedToMe.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <TicketTable tickets={assignedToMe} onSelect={setSelectedTicket} scoreMap={scoreMap} />
                </div>
              )}
              {createdByMe.length > 0 && (
                <div className="card-elevated overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                    <SendHorizonal className="h-4 w-4 text-primary" />
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Chamados que eu abri</h2>
                      <p className="text-xs text-muted-foreground">{createdByMe.length} chamado{createdByMe.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <TicketTable tickets={createdByMe} onSelect={setSelectedTicket} scoreMap={scoreMap} />
                </div>
              )}
              {availableTickets.length === 0 && assignedToMe.length === 0 && createdByMe.length === 0 && (
                <div className="card-elevated p-12 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Nenhum chamado encontrado.</p>
                </div>
              )}
            </div>
          );
        })()
      )}

      {showModal && <NewTicketModal onClose={() => setShowModal(false)} />}
      {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  );
}
