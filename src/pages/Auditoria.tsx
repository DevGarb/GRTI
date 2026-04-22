import { ShieldCheck, Search, Download, Calendar, FileSpreadsheet, Trash2, TicketCheck } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MonthSelector, { getCurrentMonthValue, getMonthDateRange } from "@/components/MonthSelector";

// ─── Aba Chamados ────────────────────────────────────────────────────────────

function TabChamados() {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue());
  const [exportingReport, setExportingReport] = useState(false);

  const { from: monthFrom, to: monthTo } = getMonthDateRange(selectedMonth);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["auditoria-chamados", selectedMonth],
    queryFn: async () => {
      // Chamados criados no mês selecionado
      const { data: rawTickets, error } = await supabase
        .from("tickets")
        .select("id, title, status, created_at, created_by, assigned_to, category_id")
        .gte("created_at", monthFrom.toISOString())
        .lte("created_at", monthTo.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!rawTickets || rawTickets.length === 0) return [];

      const ticketIds = rawTickets.map((t) => t.id);

      // Perfis: criadores + técnicos atribuídos (uma única query)
      const allProfileIds = [...new Set([
        ...rawTickets.map((t) => t.created_by),
        ...rawTickets.map((t) => t.assigned_to),
      ].filter(Boolean))] as string[];
      let profileMap = new Map<string, string>();
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", allProfileIds);
        profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Sem nome"]));
      }

      // Pontuação (meta evaluation)
      const { data: metaEvals } = await supabase
        .from("evaluations")
        .select("ticket_id, score")
        .eq("type", "meta")
        .in("ticket_id", ticketIds);
      const scoreMap = new Map((metaEvals || []).map((e) => [e.ticket_id, e.score]));

      // Categoria micro (a folha diretamente atribuída ao chamado)
      const catIds = [...new Set(rawTickets.map((t) => t.category_id).filter(Boolean))] as string[];
      let catMap = new Map<string, string>();
      if (catIds.length > 0) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name")
          .in("id", catIds);
        catMap = new Map((cats || []).map((c) => [c.id, c.name]));
      }

      return rawTickets.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        createdAt: t.created_at,
        openedBy: profileMap.get(t.created_by) || "Desconhecido",
        assignedTo: t.assigned_to ? profileMap.get(t.assigned_to) || "Desconhecido" : "Não atribuído",
        score: scoreMap.get(t.id) ?? null,
        categoryName: t.category_id ? catMap.get(t.category_id) ?? "—" : "—",
      }));
    },
  });

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.openedBy.toLowerCase().includes(q) ||
      t.assignedTo.toLowerCase().includes(q) ||
      t.categoryName.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  const exportCSV = async () => {
    setExportingReport(true);
    try {
      if (filtered.length === 0) {
        toast.error("Nenhum chamado para exportar.");
        return;
      }
      const headers = ["ID do Chamado", "Quem Abriu", "Técnico Atribuído", "Título", "Data", "Status", "Pontuação", "Categoria"];
      const rows = filtered.map((t) => [
        t.id,
        t.openedBy,
        t.assignedTo,
        t.title,
        new Date(t.createdAt).toLocaleDateString("pt-BR"),
        t.status,
        t.score !== null ? String(t.score) : "—",
        t.categoryName,
      ]);
      const bom = "\uFEFF";
      const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))].join("\n");
      const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria_chamados_${selectedMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exportado com sucesso!");
    } catch {
      toast.error("Erro ao exportar.");
    } finally {
      setExportingReport(false);
    }
  };

  const statusColors: Record<string, string> = {
    "Fechado": "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    "Em Andamento": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    "Aberto": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "Disponível": "bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título, quem abriu, categoria ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={exportingReport} className="gap-2 ml-auto">
          <FileSpreadsheet className="h-4 w-4" />
          {exportingReport ? "Exportando..." : "Exportar CSV"}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total de chamados</p>
          <p className="text-2xl font-bold text-foreground mt-1">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Com pontuação</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {filtered.filter((t) => t.score !== null && t.score > 0).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Fechados</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {filtered.filter((t) => t.status === "Fechado").length}
          </p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Nenhum chamado encontrado para o período selecionado.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Quem Abriu</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Técnico Atribuído</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Título</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Pontuação</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Categoria</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-muted-foreground">{t.id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{t.openedBy}</td>
                    <td className="px-4 py-3 text-foreground">{t.assignedTo}</td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <span className="truncate block text-foreground">{t.title}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[t.status] || "bg-muted text-muted-foreground"}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.score !== null && t.score > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {t.score} pts
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.categoryName}</td>
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

// ─── Aba Exclusões ────────────────────────────────────────────────────────────

function TabExclusoes() {
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditoria-exclusoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("action", "delete")
        .eq("entity_type", "ticket")
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
    const q = search.toLowerCase();
    return (
      l.userName.toLowerCase().includes(q) ||
      l.userEmail.toLowerCase().includes(q) ||
      (l.entity_id || "").toLowerCase().includes(q)
    );
  });

  const exportCSV = () => {
    const headers = ["Data/Hora", "Usuário", "Email", "ID do Chamado", "Detalhes"];
    const rows = filtered.map((l: any) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.userName,
      l.userEmail,
      l.entity_id || "",
      JSON.stringify(l.details || {}),
    ]);
    const bom = "\uFEFF";
    const csv = [headers.join(";"), ...rows.map((r: string[]) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exclusoes_chamados_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado com sucesso!");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por usuário, email ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 ml-auto">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <Trash2 className="h-4 w-4 text-destructive" />
        <span className="text-sm text-foreground font-medium">{filtered.length} exclus{filtered.length !== 1 ? "ões" : "ão"} de chamados registrada{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Nenhuma exclusão de chamado encontrada.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">ID do Chamado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Detalhes</th>
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
                      <p className="font-medium text-foreground">{log.userName}</p>
                      <p className="text-[11px] text-muted-foreground">{log.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-muted-foreground">{log.entity_id?.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3 max-w-[300px]">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <p className="text-xs text-muted-foreground truncate">{JSON.stringify(log.details)}</p>
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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Auditoria() {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"chamados" | "exclusoes">("chamados");

  const canAccess = hasRole("admin") || hasRole("auditor" as any);
  if (!canAccess) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
          <p className="text-sm text-muted-foreground">Auditoria de chamados — somente admin e auditor</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("chamados")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "chamados" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TicketCheck className="h-3.5 w-3.5" /> Chamados
        </button>
        <button
          onClick={() => setActiveTab("exclusoes")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "exclusoes" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" /> Exclusões
        </button>
      </div>

      {activeTab === "chamados" ? <TabChamados /> : <TabExclusoes />}
    </div>
  );
}
