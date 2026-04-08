import { useState } from "react";
import { Search, Filter, ChevronDown, ChevronRight, Plus, User, RefreshCw, Inbox, SendHorizonal, HandMetal, AlertTriangle, Clock, TicketCheck, CircleDot, Loader2, CheckCircle2 } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { useTickets, Ticket, usePickTicket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import NewTicketModal from "@/components/NewTicketModal";
import TicketDetailModal from "@/components/TicketDetailModal";

const allStatuses = ["Aberto", "Em Andamento", "Aguardando Aprovação", "Aprovado", "Fechado", "Disponível"];

const statusBadgeColors: Record<string, string> = {
  "Aberto": "bg-red-500 text-white",
  "Em Andamento": "bg-amber-500 text-white",
  "Aguardando Aprovação": "bg-blue-500 text-white",
  "Aprovado": "bg-emerald-500 text-white",
  "Fechado": "bg-primary text-primary-foreground",
  "Disponível": "bg-red-600 text-white",
};
function TicketTable({ tickets, onSelect }: { tickets: Ticket[]; onSelect: (t: Ticket) => void }) {
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
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AvailableTicketsSection({ tickets, onSelect }: { tickets: Ticket[]; onSelect: (t: Ticket) => void }) {
  const pickTicket = usePickTicket();

  return (
    <div className="card-elevated overflow-hidden border-2 border-red-300 dark:border-red-700">
      <div className="px-4 py-3 border-b border-border bg-red-50 dark:bg-red-950/30 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Disponíveis para assumir</h2>
          <p className="text-xs text-red-600/70 dark:text-red-400/70">{tickets.length} chamado{tickets.length !== 1 ? 's' : ''} com SLA expirado</p>
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
              Pegar para mim
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Chamados() {
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos Status");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reworkFilter, setReworkFilter] = useState(false);
  const { data: tickets = [], isLoading } = useTickets();
  const { hasRole, roles, user } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchText.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchText.toLowerCase()) ||
      (t.creatorProfile?.full_name || "").toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === "Todos Status" || t.status === statusFilter;
    const matchDateFrom = !dateFrom || t.created_at >= dateFrom;
    const matchDateTo = !dateTo || t.created_at <= dateTo + "T23:59:59";
    const matchRework = !reworkFilter || (t.reworkCount || 0) > 0;
    return matchSearch && matchStatus && matchDateFrom && matchDateTo && matchRework;
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
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Novo Chamado
        </button>
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
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
            />
          </div>
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
                    <TicketTable tickets={userTickets} onSelect={setSelectedTicket} />
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
              {availableTickets.length > 0 && (
                <AvailableTicketsSection tickets={availableTickets} onSelect={setSelectedTicket} />
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
                  <TicketTable tickets={assignedToMe} onSelect={setSelectedTicket} />
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
                  <TicketTable tickets={createdByMe} onSelect={setSelectedTicket} />
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
