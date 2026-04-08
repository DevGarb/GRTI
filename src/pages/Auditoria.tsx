import { ShieldCheck, Search, Filter, Download, Calendar, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcBusinessMinutes } from "@/lib/businessHours";
import { toast } from "sonner";

const actionLabels: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  login: "Login",
  status_change: "Alteração de status",
  rework: "Retrabalho",
};

const entityLabels: Record<string, string> = {
  ticket: "Chamado",
  user: "Usuário",
  organization: "Organização",
  patrimonio: "Patrimônio",
  category: "Categoria",
  sector: "Setor",
  project: "Projeto",
  preventive: "Preventiva",
};

const actionColors: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  update: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  login: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  status_change: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rework: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

export default function Auditoria() {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");

  const canAccess = hasRole("admin") || hasRole("auditor" as any);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditoria-logs"],
    enabled: canAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const userIds = [...new Set(data.map((l: any) => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, { name: p.full_name, email: p.email }])
      );

      return data.map((l: any) => ({
        ...l,
        userName: profileMap.get(l.user_id)?.name || "Desconhecido",
        userEmail: profileMap.get(l.user_id)?.email || "",
      }));
    },
  });

  const filtered = logs.filter((l: any) => {
    const matchesSearch =
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      (l.entity_id || "").toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === "all" || l.action === filterAction;
    const matchesEntity = filterEntity === "all" || l.entity_type === filterEntity;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const uniqueActions = [...new Set(logs.map((l: any) => l.action))];
  const uniqueEntities = [...new Set(logs.map((l: any) => l.entity_type))];

  const exportCSV = () => {
    const headers = ["Data/Hora", "Usuário", "Email", "Ação", "Entidade", "ID Entidade", "Detalhes"];
    const rows = filtered.map((l: any) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.userName,
      l.userEmail,
      actionLabels[l.action] || l.action,
      entityLabels[l.entity_type] || l.entity_type,
      l.entity_id || "",
      JSON.stringify(l.details || {}),
    ]);
    const csv = [headers.join(";"), ...rows.map((r: string[]) => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [exportingReport, setExportingReport] = useState(false);

  const exportTicketReport = async () => {
    setExportingReport(true);
    try {
      // Fetch all closed tickets
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, title, status, created_at, updated_at, assigned_to, category_id")
        .eq("status", "Fechado");

      if (!tickets || tickets.length === 0) {
        toast.error("Nenhum chamado fechado encontrado.");
        setExportingReport(false);
        return;
      }

      // Get technician profiles
      const techIds = [...new Set(tickets.map(t => t.assigned_to).filter(Boolean))] as string[];
      let techMap = new Map<string, string>();
      if (techIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", techIds);
        techMap = new Map((profiles || []).map(p => [p.user_id, p.full_name || "Sem nome"]));
      }

      // Get evaluations (CSAT, 0-5)
      const ticketIds = tickets.map(t => t.id);
      const { data: evals } = await supabase
        .from("evaluations")
        .select("ticket_id, score, type")
        .in("ticket_id", ticketIds)
        .eq("type", "satisfaction");
      const evalMap = new Map((evals || []).map(e => [e.ticket_id, e.score]));

      // Get categories (subcategories with scores)
      const catIds = [...new Set(tickets.map(t => t.category_id).filter(Boolean))] as string[];
      let catMap = new Map<string, { name: string; score: number | null }>();
      if (catIds.length > 0) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name, score")
          .in("id", catIds);
        (cats || []).forEach(c => catMap.set(c.id, { name: c.name, score: c.score }));
      }

      // Build rows grouped by technician
      const grouped = new Map<string, typeof tickets>();
      tickets.forEach(t => {
        const techName = t.assigned_to ? (techMap.get(t.assigned_to) || "Sem nome") : "Não atribuído";
        if (!grouped.has(techName)) grouped.set(techName, []);
        grouped.get(techName)!.push(t);
      });

      // Sort technicians alphabetically
      const sortedTechs = [...grouped.keys()].sort();

      const formatMinutes = (mins: number): string => {
        if (mins <= 0) return "0m";
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        if (h === 0) return `${m}m`;
        return `${h}h${m.toString().padStart(2, "0")}m`;
      };

      const headers = ["Técnico", "Chamado", "Tempo (horário comercial)", "CSAT (0-5)", "Pontuação Subcategoria", "Subcategoria"];
      const rows: string[][] = [];

      sortedTechs.forEach(techName => {
        const techTickets = grouped.get(techName)!;
        techTickets.forEach(t => {
          const mins = calcBusinessMinutes(new Date(t.created_at), new Date(t.updated_at));
          const csat = evalMap.get(t.id);
          const cat = t.category_id ? catMap.get(t.category_id) : undefined;
          rows.push([
            techName,
            t.title,
            formatMinutes(mins),
            csat !== undefined ? String(csat) : "—",
            cat?.score !== undefined && cat?.score !== null ? String(cat.score) : "—",
            cat?.name || "—",
          ]);
        });
      });

      const csvContent = [
        headers.join(";"),
        ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(";")),
      ].join("\n");

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_chamados_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Relatório exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar relatório.");
    } finally {
      setExportingReport(false);
    }
  };

  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
            <p className="text-sm text-muted-foreground">
              Trilha de auditoria completa — somente admin e auditor
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportTicketReport} disabled={exportingReport} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {exportingReport ? "Exportando..." : "Relatório Chamados"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Auditoria
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por usuário, email, entidade ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ações</SelectItem>
            {uniqueActions.map((a) => (
              <SelectItem key={a} value={a}>
                {actionLabels[a] || a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas entidades</SelectItem>
            {uniqueEntities.map((e) => (
              <SelectItem key={e} value={e}>
                {entityLabels[e] || e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total de registros", value: filtered.length },
          { label: "Criações", value: filtered.filter((l: any) => l.action === "create").length },
          { label: "Atualizações", value: filtered.filter((l: any) => l.action === "update").length },
          { label: "Exclusões", value: filtered.filter((l: any) => l.action === "delete").length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Logs */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Nenhum registro de auditoria encontrado.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ação</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entidade</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log: any) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{log.userName}</p>
                        <p className="text-[11px] text-muted-foreground">{log.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action] || "bg-muted text-muted-foreground"}`}
                      >
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {entityLabels[log.entity_type] || log.entity_type}
                      {log.entity_id && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground font-mono">
                          {log.entity_id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {JSON.stringify(log.details)}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
