import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download, Send, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useManagementMetrics,
  useManagementReportConfig,
  type ManagementMetricRow,
} from "@/hooks/useManagementMetrics";
import { useQueryClient } from "@tanstack/react-query";
import {
  COMMON_TIMEZONES,
  DEFAULT_TZ,
  endOfDayInTz,
  formatInTz,
  isValidTimezone,
  presetRangeInTz,
  startOfDayInTz,
  type RangePreset,
} from "@/lib/orgTimezone";

function fmtMinutes(m: number) {
  if (!m || m <= 0) return "—";
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function computeTotals(rows: ManagementMetricRow[]) {
  const t = rows.reduce(
    (acc, r) => {
      acc.closed += r.closed_in_period;
      acc.inProg += r.in_progress_now;
      acc.total += r.total_assigned;
      acc.await += r.awaiting_approval;
      acc.points += Number(r.points || 0);
      acc.rework += r.rework_count;
      acc.csatSum += Number(r.avg_csat || 0) * r.csat_count;
      acc.csatCount += r.csat_count;
      acc.handleSum += Number(r.avg_handle_minutes || 0) * r.closed_in_period;
      acc.handleW += r.closed_in_period;
      return acc;
    },
    { closed: 0, inProg: 0, total: 0, await: 0, points: 0, rework: 0, csatSum: 0, csatCount: 0, handleSum: 0, handleW: 0 }
  );
  return {
    ...t,
    reworkPct: t.closed > 0 ? (t.rework / t.closed) * 100 : 0,
    avgCsat: t.csatCount > 0 ? t.csatSum / t.csatCount : 0,
    avgHandle: t.handleW > 0 ? t.handleSum / t.handleW : 0,
  };
}

function exportCsv(rows: ManagementMetricRow[], from: Date, to: Date) {
  const headers = [
    "Técnico", "Fechados no período", "Em andamento", "Total atribuídos",
    "Aguardando aprovação", "Pontuação", "Retrabalho", "% Retrabalho",
    "CSAT médio", "Qtd avaliações", "TMA (min)",
  ];
  const lines = rows.map((r) => [
    r.full_name, r.closed_in_period, r.in_progress_now, r.total_assigned,
    r.awaiting_approval, r.points, r.rework_count, r.rework_percent,
    r.avg_csat, r.csat_count, r.avg_handle_minutes,
  ].map((v) => String(v ?? "").replace(/;/g, ",")).join(";"));
  const csv = "\uFEFF" + [headers.join(";"), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `metricas-gerenciais_${format(from, "yyyy-MM-dd")}_${format(to, "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MetricasGerenciais() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  const queryClient = useQueryClient();
  const { data: config } = useManagementReportConfig(orgId);

  const orgTz = useMemo(() => {
    const tz = config?.timezone || DEFAULT_TZ;
    return isValidTimezone(tz) ? tz : DEFAULT_TZ;
  }, [config?.timezone]);

  const [range, setRange] = useState(() => presetRangeInTz("yesterday", DEFAULT_TZ));
  const [editFrom, setEditFrom] = useState<Date | undefined>(range.from);
  const [editTo, setEditTo] = useState<Date | undefined>(range.to);

  // Quando o fuso da organização chegar/mudar, recalcula o D-1 padrão.
  useEffect(() => {
    const r = presetRangeInTz("yesterday", orgTz);
    setRange(r); setEditFrom(r.from); setEditTo(r.to);
  }, [orgTz]);

  const { data: rows = [], isLoading, refetch } = useManagementMetrics(range.from, range.to, orgId);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [sendTime, setSendTime] = useState("08:00");
  const [timezone, setTimezone] = useState<string>(DEFAULT_TZ);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (config) {
      setWebhookUrl(config.webhook_url ?? "");
      setSendTime((config.send_time ?? "08:00").slice(0, 5));
      setIsActive(config.is_active);
      setTimezone(config.timezone || DEFAULT_TZ);
    }
  }, [config]);

  const totals = useMemo(() => computeTotals(rows), [rows]);

  async function saveConfig() {
    if (!orgId) return;
    if (!isValidTimezone(timezone)) {
      toast.error("Fuso horário inválido");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(sendTime)) {
      toast.error("Horário inválido (use HH:MM)");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId,
        webhook_url: webhookUrl || null,
        send_time: sendTime + ":00",
        is_active: isActive,
        timezone,
      };
      const { error } = await supabase
        .from("management_report_config" as any)
        .upsert(payload, { onConflict: "organization_id" });
      if (error) throw error;
      toast.success("Configuração salva");
      queryClient.invalidateQueries({ queryKey: ["management-report-config"] });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function sendNow(dryRun = false) {
    if (!orgId) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-management-report", {
        body: { organization_id: orgId, dry_run: dryRun },
      });
      if (error) throw error;
      if (dryRun) {
        toast.success("Pré-visualização gerada (veja o console)");
        console.log("[D-1 preview]", data);
      } else {
        toast.success("Relatório enviado para o webhook");
      }
    } catch (e: any) {
      toast.error("Erro: " + (e?.message ?? e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Métricas Gerenciais</h1>
          <p className="text-sm text-muted-foreground">
            Relatório por técnico/desenvolvedor — janela padrão D-1 (ontem) no fuso{" "}
            <span className="font-medium">{orgTz}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["yesterday", "today", "last7", "thisMonth"] as const as RangePreset[]).map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              onClick={() => {
                const r = presetRangeInTz(p, orgTz);
                setRange(r); setEditFrom(r.from); setEditTo(r.to);
              }}
            >
              {p === "yesterday" ? "Ontem (D-1)" : p === "today" ? "Hoje" : p === "last7" ? "Últimos 7 dias" : "Mês atual"}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {formatInTz(range.from, orgTz, { day: "2-digit", month: "2-digit" })} → {formatInTz(range.to, orgTz, { day: "2-digit", month: "2-digit" })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 pointer-events-auto" align="end">
              <div className="flex gap-3">
                <div>
                  <p className="text-xs font-medium mb-1">Início</p>
                  <Calendar mode="single" selected={editFrom} onSelect={setEditFrom} className="rounded-md border pointer-events-auto" />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">Fim</p>
                  <Calendar mode="single" selected={editTo} onSelect={setEditTo} className="rounded-md border pointer-events-auto" />
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (editFrom && editTo) setRange({ from: startOfDayInTz(editFrom, orgTz), to: endOfDayInTz(editTo, orgTz) });
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCsv(rows, range.from, range.to)}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        </div>
      </div>

      {/* Totais */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
        <KpiCard title="Fechados no período" value={totals.closed} />
        <KpiCard title="Em andamento" value={totals.inProg} />
        <KpiCard title="Aguardando aprovação" value={totals.await} />
        <KpiCard title="Total atribuídos" value={totals.total} />
        <KpiCard title="Pontuação" value={totals.points.toFixed(0)} />
        <KpiCard title="% Retrabalho" value={`${totals.reworkPct.toFixed(1)}%`} />
        <KpiCard title="CSAT médio" value={totals.avgCsat > 0 ? totals.avgCsat.toFixed(2) : "—"} />
        <KpiCard title="TMA médio" value={fmtMinutes(totals.avgHandle)} />
      </div>

      {/* Tabela por técnico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por técnico / desenvolvedor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-right">Fechados</TableHead>
                  <TableHead className="text-right">Em andamento</TableHead>
                  <TableHead className="text-right">Aguard. aprov.</TableHead>
                  <TableHead className="text-right">Total atrib.</TableHead>
                  <TableHead className="text-right">Pontuação</TableHead>
                  <TableHead className="text-right">% Retrabalho</TableHead>
                  <TableHead className="text-right">CSAT</TableHead>
                  <TableHead className="text-right">TMA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sem dados no período</TableCell></TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell className="text-right">{r.closed_in_period}</TableCell>
                      <TableCell className="text-right">{r.in_progress_now}</TableCell>
                      <TableCell className="text-right">{r.awaiting_approval}</TableCell>
                      <TableCell className="text-right">{r.total_assigned}</TableCell>
                      <TableCell className="text-right">{Number(r.points).toFixed(0)}</TableCell>
                      <TableCell className={cn("text-right", r.rework_percent >= 20 && "text-red-600 font-semibold")}>
                        {r.rework_percent.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {r.csat_count > 0 ? `${Number(r.avg_csat).toFixed(2)} (${r.csat_count})` : "—"}
                      </TableCell>
                      <TableCell className="text-right">{fmtMinutes(Number(r.avg_handle_minutes))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Configuração do envio automático */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Envio automático diário (D-1) via webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="webhook">URL do webhook</Label>
              <Input id="webhook" placeholder="https://..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">POST com payload JSON contendo totais e linha por técnico. O intervalo D-1 é calculado de 00:00:00 até 23:59:59.999 no fuso selecionado.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tz">Fuso horário</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="tz"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time">Horário de envio ({timezone})</Label>
              <Input id="time" type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)} />
            </div>
            <div className="space-y-1.5 flex items-end">
              <p className="text-xs text-muted-foreground">
                Próximo D-1: {formatInTz(presetRangeInTz("yesterday", timezone).from, timezone, { day: "2-digit", month: "2-digit", year: "numeric" })} (00:00 → 23:59)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
            <Label htmlFor="active">Envio automático habilitado</Label>
          </div>
          {config?.last_sent_at && (
            <p className="text-xs text-muted-foreground">
              Último envio: {format(new Date(config.last_sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveConfig} disabled={saving}>{saving ? "Salvando…" : "Salvar configuração"}</Button>
            <Button variant="outline" onClick={() => sendNow(true)} disabled={sending}>
              Pré-visualizar payload
            </Button>
            <Button variant="outline" onClick={() => sendNow(false)} disabled={sending || !webhookUrl}>
              <Send className="h-4 w-4 mr-1" />Enviar agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
