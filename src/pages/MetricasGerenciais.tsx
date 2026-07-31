import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download, Send, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useManagementMetrics,
  useManagementReportConfig,
  type ManagementMetricRow,
} from "@/hooks/useManagementMetrics";
import { useExecutiveOverview, useDailyInsights, regenerateDailyInsights } from "@/hooks/useExecutiveSummary";
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
import { ExecutiveSummary } from "@/components/metricas/ExecutiveSummary";
import { InsightsCard } from "@/components/metricas/InsightsCard";
import { GoalsAnalysisCard } from "@/components/metricas/GoalsAnalysisCard";
import { useGoalsAnalysis, useGoalsInsights } from "@/hooks/useGoalsAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamRanking } from "@/components/metricas/TeamRanking";
import { WhatsappSummary } from "@/components/metricas/WhatsappSummary";
import { formatDateTimeBR } from "@/lib/dateFormat";


function computeTotals(rows: ManagementMetricRow[]) {
  const t = rows.reduce(
    (acc, r) => {
      acc.closed += r.closed_in_period;
      acc.inProg += r.in_progress_now;
      acc.await += r.awaiting_approval;
      acc.points += Number(r.points || 0);
      acc.rework += r.rework_count;
      acc.csatSum += Number(r.avg_csat || 0) * r.csat_count;
      acc.csatCount += r.csat_count;
      acc.handleSum += Number(r.avg_handle_minutes || 0) * r.closed_in_period;
      acc.handleW += r.closed_in_period;
      return acc;
    },
    { closed: 0, inProg: 0, await: 0, points: 0, rework: 0, csatSum: 0, csatCount: 0, handleSum: 0, handleW: 0 }
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
    "Técnico", "Fechados", "Em andamento", "Total atribuídos",
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

  const [range, setRange] = useState(() => presetRangeInTz("today", DEFAULT_TZ));
  const [editFrom, setEditFrom] = useState<Date | undefined>(range.from);
  const [editTo, setEditTo] = useState<Date | undefined>(range.to);
  const [activePreset, setActivePreset] = useState<RangePreset | "custom">("today");

  useEffect(() => {
    const r = presetRangeInTz("today", orgTz);
    setRange(r); setEditFrom(r.from); setEditTo(r.to); setActivePreset("today");
  }, [orgTz]);

  const { data: rows = [], isLoading, refetch } = useManagementMetrics(range.from, range.to, orgId);
  const { data: overview } = useExecutiveOverview(orgId);
  const [insightsEnabled, setInsightsEnabled] = useState(false);
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useDailyInsights({
    organizationId: orgId, from: range.from, to: range.to, enabled: insightsEnabled,
  });
  const [regenerating, setRegenerating] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [sendTime, setSendTime] = useState("18:00");
  const [timezone, setTimezone] = useState<string>(DEFAULT_TZ);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (config) {
      setWebhookUrl(config.webhook_url ?? "");
      setSendTime((config.send_time ?? "18:00").slice(0, 5));
      setIsActive(config.is_active);
      setTimezone(config.timezone || DEFAULT_TZ);
    }
  }, [config]);

  const totals = useMemo(() => computeTotals(rows), [rows]);

  const backlogTotal = overview?.backlog_total ?? (totals.inProg + totals.await);
  const awaitCount = overview?.awaiting_approval_count ?? totals.await;
  const inProgCount = overview?.in_progress_count ?? totals.inProg;
  const activeTechs = overview?.active_technicians ?? rows.filter(r => r.in_progress_now > 0 || r.awaiting_approval > 0).length;

  async function generateInsights() {
    setInsightsEnabled(true);
    if (insights) {
      // Already loaded: regenerate
      if (!orgId) return;
      setRegenerating(true);
      try {
        const data = await regenerateDailyInsights({ organizationId: orgId, from: range.from, to: range.to });
        queryClient.setQueryData(["daily-insights", orgId, range.from.toISOString(), range.to.toISOString()], data);
        toast.success("Resumo atualizado");
      } catch (e: any) {
        toast.error("Erro ao gerar: " + (e?.message ?? e));
      } finally {
        setRegenerating(false);
      }
    } else {
      await refetchInsights();
    }
  }

  async function saveConfig() {
    if (!orgId) return;
    if (!isValidTimezone(timezone)) { toast.error("Fuso horário inválido"); return; }
    if (!/^\d{2}:\d{2}$/.test(sendTime)) { toast.error("Horário inválido (use HH:MM)"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("management_report_config" as any)
        .upsert({
          organization_id: orgId,
          webhook_url: webhookUrl || null,
          send_time: sendTime + ":00",
          is_active: isActive,
          timezone,
        }, { onConflict: "organization_id" });
      if (error) throw error;
      toast.success("Configuração salva");
      queryClient.invalidateQueries({ queryKey: ["management-report-config"] });
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message ?? e));
    } finally { setSaving(false); }
  }

  async function sendNow(dryRun = false) {
    if (!orgId) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-management-report", {
        body: { organization_id: orgId, from: range.from.toISOString(), to: range.to.toISOString(), dry_run: dryRun },
      });
      if (error) throw error;
      if (dryRun) {
        toast.success("Pré-visualização gerada (veja o console)");
        console.log("[payload preview]", data);
      } else {
        toast.success("Relatório enviado para o webhook");
      }
    } catch (e: any) {
      toast.error("Erro: " + (e?.message ?? e));
    } finally { setSending(false); }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Métricas Gerenciais</h1>
          <p className="text-sm text-muted-foreground">
            Visão executiva — fuso <span className="font-medium">{orgTz}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "yesterday", "last7", "thisMonth"] as const as RangePreset[]).map((p) => (
            <Button
              key={p}
              variant={activePreset === p ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const r = presetRangeInTz(p, orgTz);
                setRange(r); setEditFrom(r.from); setEditTo(r.to); setActivePreset(p);
              }}
            >
              {p === "yesterday" ? "Ontem" : p === "today" ? "Hoje" : p === "last7" ? "7 dias" : "Mês"}
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
                <Button size="sm" onClick={() => {
                  if (editFrom && editTo) { setRange({ from: startOfDayInTz(editFrom, orgTz), to: endOfDayInTz(editTo, orgTz) }); setActivePreset("custom"); }
                }}>Aplicar</Button>
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

      {/* 1. Resumo Executivo */}
      <ExecutiveSummary
        closed={totals.closed}
        inProgress={inProgCount}
        awaiting={awaitCount}
        backlog={backlogTotal}
        csat={totals.avgCsat}
        csatCount={totals.csatCount}
        tmaMinutes={totals.avgHandle}
        points={totals.points}
        activeTechs={activeTechs}
        reworkPercent={totals.reworkPct}
      />

      {/* 2. Insights + Ranking lado a lado em desktop */}
      <div className="grid gap-4 lg:grid-cols-2">
        {insightsEnabled ? (
          <InsightsCard
            insights={insights?.insights ?? []}
            highlights={insights?.highlights ?? []}
            risks={insights?.risks ?? []}
            loading={insightsLoading || regenerating}
            onRegenerate={generateInsights}
          />
        ) : (
          <Card className="border-dashed border-primary/40">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3 h-full">
              <Sparkles className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">Gere insights e o resumo executivo com IA para o período selecionado.</p>
              <Button onClick={generateInsights}>
                <Sparkles className="h-4 w-4 mr-1" /> Gerar Resumo Executivo
              </Button>
            </CardContent>
          </Card>
        )}

        <TeamRanking rows={rows} technicianSummaries={insights?.technician_summaries} />
      </div>

      {/* 3. Resumo WhatsApp (mostrado após gerar) */}
      {insights?.whatsapp_message && (
        <WhatsappSummary
          message={insights.whatsapp_message}
          onSendNow={() => sendNow(false)}
          sending={sending}
          webhookConfigured={!!webhookUrl}
        />
      )}

      {/* 4. Configuração do envio automático */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Envio automático diário via webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-3">
              <Label htmlFor="webhook">URL do webhook</Label>
              <Input id="webhook" placeholder="https://..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">POST com payload contendo totais, ranking, insights, mensagem WhatsApp pronta e status operacional. Útil para integrar com n8n → grupo corporativo.</p>
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
                Próximo D-1: {formatInTz(presetRangeInTz("yesterday", timezone).from, timezone, { day: "2-digit", month: "2-digit", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
            <Label htmlFor="active">Enviar resumo automaticamente</Label>
          </div>
          {config?.last_sent_at && (
            <p className="text-xs text-muted-foreground">
              Último envio: {formatDateTimeBR(config.last_sent_at)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveConfig} disabled={saving}>{saving ? "Salvando…" : "Salvar configuração"}</Button>
            <Button variant="outline" onClick={() => sendNow(true)} disabled={sending}>Pré-visualizar payload</Button>
            <Button variant="outline" onClick={() => sendNow(false)} disabled={sending || !webhookUrl}>
              <Send className="h-4 w-4 mr-1" />Enviar agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
