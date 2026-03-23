import { useState } from "react";
import { Webhook, CheckCircle, XCircle, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WEBHOOK_EVENTS } from "@/hooks/useWebhooks";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "success", label: "Sucesso (2xx)" },
  { value: "error", label: "Erro" },
];

export default function WebhookLogs() {
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const filtered = logs.filter((log: any) => {
    if (eventFilter !== "all" && log.event_type !== eventFilter) return false;
    if (statusFilter === "success" && !(log.status_code >= 200 && log.status_code < 300)) return false;
    if (statusFilter === "error" && log.status_code >= 200 && log.status_code < 300) return false;
    return true;
  });

  const eventOptions = [
    { value: "all", label: "Todos os eventos" },
    { value: "webhook_test", label: "Teste manual" },
    ...WEBHOOK_EVENTS.map((e) => ({ value: `webhook_${e.value}`, label: e.label })),
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Webhook className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhook Logs</h1>
          <p className="text-sm text-muted-foreground">Registro de eventos enviados via webhook</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          {eventOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} registro(s)</span>
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">
          Nenhum log encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log: any) => {
            const isSuccess = log.status_code >= 200 && log.status_code < 300;
            return (
              <div key={log.id} className="card-elevated p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isSuccess
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {isSuccess ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {log.status_code}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{log.event_type}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {log.ticket_id && (
                    <p>Ticket: {log.ticket_id.slice(0, 8)}... — {log.ticket_title || "Sem título"}</p>
                  )}
                  {log.technician_name && <p>Técnico: {log.technician_name}</p>}
                  {log.response && Object.keys(log.response).length > 0 && (
                    <p>Resposta: {JSON.stringify(log.response)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
