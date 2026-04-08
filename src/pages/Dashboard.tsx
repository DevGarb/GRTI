import { useState } from "react";
import { motion } from "framer-motion";
import TicketDetailModal from "@/components/TicketDetailModal";
import MonthSelector, { getCurrentMonthValue, getMonthDateRange } from "@/components/MonthSelector";
import {
  Ticket,
  Clock,
  Trophy,
  Star,
  Wrench,
  AlertCircle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { useTickets } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";


const anim = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3 },
  }),
};

type DashTab = "todos" | "categorias";

export default function Dashboard() {
  const { data: tickets = [], isLoading } = useTickets();
  const { data: metrics_data } = useDashboardMetrics();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashTab>("todos");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { from: dateFrom, to: dateTo } = getMonthDateRange(selectedMonth);

  // Apply date range filter
  const periodTickets = tickets.filter((t) => {
    const d = new Date(t.created_at);
    if (d < dateFrom) return false;
    if (d > dateTo) return false;
    return true;
  });

  // Filter tickets based on active tab
  const filteredTickets = periodTickets.filter((t) => {
    switch (activeTab) {
      case "todos":
        return true;
      case "categorias":
        return true;
      default:
        return true;
    }
  });

  const openTickets = filteredTickets.filter((t) => t.status === "Aberto");
  const inProgressTickets = filteredTickets.filter((t) => t.status === "Em Andamento");
  const totalTickets = filteredTickets.length;
  const closedTickets = filteredTickets.filter((t) => t.status === "Fechado");
  const reworkedTickets = filteredTickets.filter((t) => (t.reworkCount || 0) > 0);
  const totalReworks = filteredTickets.reduce((sum, t) => sum + (t.reworkCount || 0), 0);

  // Category data
  const categoryMap = filteredTickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {});
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // Status data
  const statusMap = filteredTickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const statusColors: Record<string, string> = {
    "Aberto": "hsl(0, 72%, 51%)",
    "Em Andamento": "hsl(35, 92%, 50%)",
    "Aguardando Aprovação": "hsl(210, 70%, 50%)",
    "Aprovado": "hsl(142, 70%, 40%)",
    "Fechado": "hsl(180, 67%, 18%)",
  };

  // Technician performance
  const techPerformance = filteredTickets.reduce<Record<string, { chamados: number; fechados: number }>>((acc, t) => {
    const name = t.assignedProfile?.full_name || "Não atribuído";
    if (!acc[name]) acc[name] = { chamados: 0, fechados: 0 };
    acc[name].chamados++;
    if (t.status === "Fechado") acc[name].fechados++;
    return acc;
  }, {});

  const techData = Object.entries(techPerformance)
    .map(([name, stats]) => ({
      name,
      ...stats,
      percent: stats.chamados > 0 ? Math.round((stats.fechados / stats.chamados) * 100) : 0,
    }))
    .sort((a, b) => b.chamados - a.chamados);

  const metrics = [
    { label: "Total Chamados", value: String(totalTickets), icon: Ticket },
    { label: "Retrabalhos", value: String(totalReworks), icon: RefreshCw },
    { label: "Tempo Médio", value: metrics_data?.avgResolutionFormatted || "0m", icon: Clock },
    { label: "Pontuação Total", value: String(metrics_data?.totalScore || 0), icon: Trophy },
    { label: "NPS Geral", value: String(metrics_data?.npsScore || 0), icon: Star },
    { label: "Preventivas", value: `${metrics_data?.preventivePercent || 0}%`, icon: Wrench },
  ];

  const tabs: { key: DashTab; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "categorias", label: "Categorias" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema</p>
      </div>

      {/* Tabs + Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="text-xs">
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            className="card-elevated p-4 flex flex-col items-center text-center"
            variants={anim}
            initial="hidden"
            animate="show"
            custom={i}
          >
            <m.icon className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-2xl font-bold text-foreground">{m.value}</span>
            <span className="text-[11px] text-muted-foreground mt-1">{m.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Open tickets alert */}
      {openTickets.length > 0 && (
        <div className="card-elevated p-4 border-l-4 border-l-destructive">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-foreground">
              Chamados em Aberto{" "}
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold ml-1">
                {openTickets.length}
              </span>
            </span>
          </div>
          <div className="space-y-1">
            {openTickets.slice(0, 8).map((t) => (
              <div key={t.id} onClick={() => setSelectedTicketId(t.id)} className="flex items-center gap-3 text-[12px] py-1.5 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 transition-colors">
                <PriorityBadge priority={t.priority} />
                <span className="font-medium text-foreground truncate flex-1">{t.title}</span>
                <span className="text-muted-foreground hidden sm:block">{t.creatorProfile?.full_name}</span>
                <span className="text-muted-foreground hidden md:block">{t.assignedProfile?.full_name || "—"}</span>
                <span className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Chamados por Status</h3>
          <div className="h-48">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={statusColors[entry.name] || "hsl(180, 67%, 18%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Chamados por Categoria</h3>
          <div className="h-48">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    stroke="none"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={`hsl(${180 + i * 40}, 50%, ${35 + i * 8}%)`} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Evolução Tempo Médio (min)</h3>
          <div className="h-48">
            {(metrics_data?.monthlyAvgTime || []).some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics_data?.monthlyAvgTime || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Evolução NPS Mensal</h3>
          <div className="h-48">
            {(metrics_data?.monthlyNps || []).some(d => d.value !== 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics_data?.monthlyNps || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[-100, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="hsl(142, 70%, 40%)" strokeWidth={2} dot={{ fill: "hsl(142, 70%, 40%)", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>
      </div>

      {/* Ranking Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ranking - Pontuação</h3>
          <div className="h-48">
            {techData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={techData.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="chamados" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>
        <div className="card-elevated p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ranking - NPS por Técnico</h3>
          <div className="h-48">
            {(metrics_data?.techNps || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics_data?.techNps?.slice(0, 5) || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[-100, 100]} />
                  <Tooltip formatter={(value: number) => [`${value}`, "NPS"]} />
                  <Bar dataKey="nps" radius={[4, 4, 0, 0]}>
                    {(metrics_data?.techNps?.slice(0, 5) || []).map((entry, i) => (
                      <Cell key={i} fill={entry.nps >= 50 ? "hsl(142, 70%, 40%)" : entry.nps >= 0 ? "hsl(35, 92%, 50%)" : "hsl(0, 72%, 51%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="card-elevated p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Avaliação de Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">Técnico</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-2">Chamados</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-2">Fechados</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-2">% Resolução</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {techData.map((tech) => (
                <tr key={tech.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-sm font-medium text-foreground">{tech.name}</td>
                  <td className="px-3 py-2.5 text-sm text-center text-foreground">{tech.chamados}</td>
                  <td className="px-3 py-2.5 text-sm text-center text-foreground">{tech.fechados}</td>
                  <td className="px-3 py-2.5 text-sm text-center text-foreground">{tech.percent}%</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      tech.percent >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      tech.percent >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {tech.percent >= 80 ? "Excelente" : tech.percent >= 50 ? "Regular" : "Atenção"}
                    </span>
                  </td>
                </tr>
              ))}
              {techData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">Sem dados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acompanhamento por Técnico */}
      <div className="card-elevated p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Acompanhamento Detalhado por Técnico</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-2">Técnico</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-2">Chamados</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-2">Pts</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-2">NPS</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-2">%Resolv.</th>
                <th className="text-center text-xs font-semibold text-muted-foreground px-3 py-2">Retrab.</th>
              </tr>
            </thead>
            <tbody>
              {techData.length > 0 ? techData.map((tech) => (
                <tr key={tech.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 text-sm font-medium text-foreground">{tech.name}</td>
                  <td className="px-3 py-2.5 text-sm text-center text-foreground">{tech.chamados}</td>
                  <td className="px-3 py-2.5 text-sm text-center text-foreground">{tech.fechados}</td>
                  <td className="px-3 py-2.5 text-sm text-center text-foreground">—</td>
                  <td className="px-3 py-2.5 text-sm text-center text-foreground">{tech.percent}%</td>
                  <td className="px-3 py-2.5 text-sm text-center text-foreground">—</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">Sem dados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Tickets */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          {activeTab === "categorias" ? "Chamados por Categoria" : 
           "Todos os Chamados"}
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="card-elevated p-8 text-center text-sm text-muted-foreground">Nenhum chamado encontrado.</div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.slice(0, 15).map((ticket, i) => (
              <motion.div
                key={ticket.id}
                className="card-elevated p-4 hover:shadow-md transition-shadow cursor-pointer"
                variants={anim}
                initial="hidden"
                animate="show"
                custom={i}
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground">{ticket.title}</h4>
                    <p className="text-[12px] text-muted-foreground mt-1 truncate">{ticket.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <PriorityBadge priority={ticket.priority} />
                      <span className="text-[11px] text-muted-foreground">• {ticket.type}</span>
                      <span className="text-[11px] text-muted-foreground">• {new Date(ticket.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {selectedTicketId && (() => {
        const ticket = tickets.find(t => t.id === selectedTicketId);
        if (!ticket) return null;
        return (
          <TicketDetailModal
            ticket={ticket}
            onClose={() => setSelectedTicketId(null)}
          />
        );
      })()}
    </div>
  );
}
