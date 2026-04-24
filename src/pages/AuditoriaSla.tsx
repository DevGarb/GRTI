import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Clock, AlertTriangle, CheckCircle2, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MonthSelector, { getCurrentMonthValue, getMonthDateRange } from "@/components/MonthSelector";
import { calcBusinessMinutes, formatBusinessTime } from "@/lib/businessHours";
import { Input } from "@/components/ui/input";

interface SlaRow {
  ticketId: string;
  title: string;
  technicianName: string;
  createdAt: string;
  startedAt: string | null;
  startedAtSource: "started_at" | "created_at (fallback)";
  resolutionEnd: string;
  resolutionEndAction: string;
  resolutionEndStatus: string | null;
  fellBackToUpdatedAt: boolean;
  slaMinutes: number;
}

const RESOLUTION_PRIORITY: Record<string, number> = {
  "Aguardando Aprovação": 1,
  "Aprovado": 2,
  "Fechado": 3,
};

export default function AuditoriaSla() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [monthValue, setMonthValue] = useState(getCurrentMonthValue());
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["auditoria-sla", monthValue, orgId],
    queryFn: async (): Promise<SlaRow[]> => {
      const { from, to } = getMonthDateRange(monthValue);

      // 1. Tickets fechados no período (filtra por created_at, mesma base do resto)
      let q = supabase
        .from("tickets")
        .select("id, title, created_at, updated_at, started_at, assigned_to")
        .eq("status", "Fechado")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());
      if (orgId) q = q.eq("organization_id", orgId);
      const { data: tickets, error } = await q;
      if (error) throw error;
      if (!tickets || tickets.length === 0) return [];

      const ticketIds = tickets.map((t) => t.id);

      // 2. Histórico de status_change relevante para resolução
      const { data: history } = await supabase
        .from("ticket_history")
        .select("ticket_id, action, new_value, created_at")
        .in("ticket_id", ticketIds)
        .eq("action", "status_change")
        .in("new_value", ["Aguardando Aprovação", "Aprovado", "Fechado"])
        .order("created_at", { ascending: true });

      // Para cada ticket, escolhe o status com maior prioridade (menor número)
      const bestEnd = new Map<
        string,
        { status: string; date: string; priority: number }
      >();
      (history || []).forEach((h: any) => {
        const p = RESOLUTION_PRIORITY[h.new_value];
        if (!p) return;
        const current = bestEnd.get(h.ticket_id);
        if (!current || p < current.priority) {
          bestEnd.set(h.ticket_id, { status: h.new_value, date: h.created_at, priority: p });
        }
      });

      // 3. Nomes dos técnicos
      const techIds = [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))] as string[];
      let nameMap = new Map<string, string>();
      if (techIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", techIds);
        nameMap = new Map((profs || []).map((p) => [p.user_id, p.full_name]));
      }

      // 4. Monta linhas
      return tickets.map((t) => {
        const startedAtSource: SlaRow["startedAtSource"] = t.started_at
          ? "started_at"
          : "created_at (fallback)";
        const start = t.started_at ? new Date(t.started_at) : new Date(t.created_at);

        const resolved = bestEnd.get(t.id);
        const fellBackToUpdatedAt = !resolved;
        const endIso = resolved?.date ?? t.updated_at;
        const end = new Date(endIso);

        const slaMinutes = calcBusinessMinutes(start, end);

        return {
          ticketId: t.id,
          title: t.title,
          technicianName: t.assigned_to
            ? nameMap.get(t.assigned_to) || "—"
            : "Sem técnico",
          createdAt: t.created_at,
          startedAt: t.started_at,
          startedAtSource,
          resolutionEnd: endIso,
          resolutionEndAction: resolved ? "status_change" : "updated_at (fallback)",
          resolutionEndStatus: resolved?.status ?? null,
          fellBackToUpdatedAt,
          slaMinutes,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(s) ||
        r.technicianName.toLowerCase().includes(s) ||
        r.ticketId.toLowerCase().includes(s)
    );
  }, [rows, search]);

  // Resumo
  const summary = useMemo(() => {
    if (rows.length === 0) {
      return { total: 0, fallbackStarted: 0, fallbackEnd: 0, avgMinutes: 0 };
    }
    const fallbackStarted = rows.filter((r) => !r.startedAt).length;
    const fallbackEnd = rows.filter((r) => r.fellBackToUpdatedAt).length;
    const avgMinutes =
      rows.reduce((s, r) => s + r.slaMinutes, 0) / rows.length;
    return { total: rows.length, fallbackStarted, fallbackEnd, avgMinutes };
  }, [rows]);

  function exportCsv() {
    const header = [
      "ticket_id",
      "titulo",
      "tecnico",
      "created_at",
      "started_at",
      "fonte_inicio",
      "fim_resolucao",
      "evento_fim",
      "status_fim",
      "fallback_updated_at",
      "sla_minutos_uteis",
      "sla_legivel",
    ];
    const lines = filtered.map((r) =>
      [
        r.ticketId,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.technicianName.replace(/"/g, '""')}"`,
        r.createdAt,
        r.startedAt ?? "",
        r.startedAtSource,
        r.resolutionEnd,
        r.resolutionEndAction,
        r.resolutionEndStatus ?? "",
        r.fellBackToUpdatedAt ? "sim" : "nao",
        Math.round(r.slaMinutes),
        formatBusinessTime(r.slaMinutes),
      ].join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-sla-${monthValue}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" /> Auditoria de SLA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detalhe do cálculo do tempo de atendimento de cada chamado fechado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector value={monthValue} onChange={setMonthValue} />
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Chamados fechados" value={String(summary.total)} icon={CheckCircle2} />
        <SummaryCard
          label="Sem started_at (fallback)"
          value={String(summary.fallbackStarted)}
          icon={AlertTriangle}
          warn={summary.fallbackStarted > 0}
        />
        <SummaryCard
          label="Sem evento de resolução"
          value={String(summary.fallbackEnd)}
          icon={AlertTriangle}
          warn={summary.fallbackEnd > 0}
        />
        <SummaryCard
          label="SLA médio (h úteis)"
          value={formatBusinessTime(summary.avgMinutes)}
          icon={Clock}
        />
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, técnico ou ID..."
          className="pl-9"
        />
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold text-muted-foreground">Chamado</th>
              <th className="px-3 py-2 font-semibold text-muted-foreground">Técnico</th>
              <th className="px-3 py-2 font-semibold text-muted-foreground">Início (started_at)</th>
              <th className="px-3 py-2 font-semibold text-muted-foreground">Fim (resolução)</th>
              <th className="px-3 py-2 font-semibold text-muted-foreground">Origem do fim</th>
              <th className="px-3 py-2 font-semibold text-muted-foreground text-right">SLA (h úteis)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum chamado fechado no período.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.ticketId} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground truncate max-w-[260px]">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {r.ticketId.slice(0, 8)}…
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.technicianName}</td>
                <td className="px-3 py-2">
                  {r.startedAt ? (
                    <div className="text-foreground">
                      {new Date(r.startedAt).toLocaleString("pt-BR")}
                    </div>
                  ) : (
                    <div className="text-amber-600 dark:text-amber-400 text-xs">
                      ⚠ usando created_at:{" "}
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="text-foreground">
                    {new Date(r.resolutionEnd).toLocaleString("pt-BR")}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {r.fellBackToUpdatedAt ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      updated_at (fallback)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      status → {r.resolutionEndStatus}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-medium text-foreground">
                  {formatBusinessTime(r.slaMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Como o SLA é calculado:</strong> tempo em horas úteis (08:00–18:00, seg–sex)
          entre <code>started_at</code> (ou <code>created_at</code>, se ausente) e o primeiro
          evento de "Aguardando Aprovação" / "Aprovado" / "Fechado" do histórico do chamado.
        </p>
        <p>
          Quando não há nenhum desses eventos no histórico (chamados antigos), o sistema usa{" "}
          <code>updated_at</code> como fallback — esses chamados aparecem destacados em amarelo
          e podem inflar o tempo médio.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  warn,
}: {
  label: string;
  value: string;
  icon: typeof Clock;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 bg-card ${
        warn ? "border-amber-300 dark:border-amber-800" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div
        className={`text-xl font-bold mt-1 ${
          warn ? "text-amber-600 dark:text-amber-400" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
