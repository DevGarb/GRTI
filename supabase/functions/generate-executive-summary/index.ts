// Gera resumo executivo + insights + mensagem WhatsApp.
// Usa Lovable AI Gateway para enriquecer com texto natural.
// Cacheia em daily_insights_cache por (org, from, to).

import { createClient } from "npm:@supabase/supabase-js@2";
import { streamLovableResponse } from "../_shared/openaiResponses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  organization_id: string;
  from: string;
  to: string;
  force?: boolean;
}

interface MetricRow {
  user_id: string;
  full_name: string;
  closed_in_period: number;
  in_progress_now: number;
  total_assigned: number;
  awaiting_approval: number;
  points: number;
  rework_count: number;
  rework_percent: number;
  avg_csat: number;
  csat_count: number;
  avg_handle_minutes: number;
}

interface Overview {
  backlog_total: number;
  open_count: number;
  in_progress_count: number;
  awaiting_approval_count: number;
  active_technicians: number;
}

function fmtMinutes(m: number) {
  if (!m || m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h > 0 ? `${h}h${String(min).padStart(2, "0")}m` : `${min}m`;
}

function computeOpStatus(opts: {
  backlogTotal: number;
  awaitingApproval: number;
  reworkPercent: number;
  avgCsat: number;
  csatCount: number;
}): "normal" | "attention" | "critical" {
  const { backlogTotal, awaitingApproval, reworkPercent, avgCsat, csatCount } = opts;
  const awaitPct = backlogTotal > 0 ? (awaitingApproval / backlogTotal) * 100 : 0;
  if (reworkPercent > 20) return "critical";
  if (csatCount >= 3 && avgCsat > 0 && avgCsat < 3) return "critical";
  if (awaitPct > 50 && awaitingApproval >= 10) return "critical";
  if (awaitPct > 30 && awaitingApproval >= 5) return "attention";
  if (reworkPercent > 10) return "attention";
  return "normal";
}

function buildHighlights(rows: MetricRow[]): { highlights: string[]; risks: string[]; techSummaries: Record<string, string> } {
  const highlights: string[] = [];
  const risks: string[] = [];
  const techSummaries: Record<string, string> = {};

  const active = rows.filter((r) => r.closed_in_period > 0 || r.in_progress_now > 0 || r.awaiting_approval > 0);

  // Destaque do dia: mais fechados (desempate por CSAT)
  const ranked = [...active].sort((a, b) => {
    if (b.closed_in_period !== a.closed_in_period) return b.closed_in_period - a.closed_in_period;
    return Number(b.avg_csat) - Number(a.avg_csat);
  });
  const star = ranked[0];
  if (star && star.closed_in_period > 0) {
    highlights.push(`${star.full_name} foi destaque com ${star.closed_in_period} chamado(s) fechado(s).`);
  }

  // Melhor CSAT
  const withCsat = active.filter((r) => r.csat_count > 0);
  if (withCsat.length > 0) {
    const bestCsat = [...withCsat].sort((a, b) => Number(b.avg_csat) - Number(a.avg_csat))[0];
    if (Number(bestCsat.avg_csat) >= 4.5) {
      highlights.push(`Melhor CSAT: ${bestCsat.full_name} (${Number(bestCsat.avg_csat).toFixed(2)} em ${bestCsat.csat_count} avaliação(ões)).`);
    }
  }

  // Riscos: técnicos com muitos chamados pendentes
  const pending = active
    .filter((r) => r.awaiting_approval + r.in_progress_now >= 4)
    .sort((a, b) => (b.awaiting_approval + b.in_progress_now) - (a.awaiting_approval + a.in_progress_now));
  pending.slice(0, 3).forEach((r) => {
    risks.push(`${r.full_name} com ${r.in_progress_now + r.awaiting_approval} chamados pendentes (${r.in_progress_now} em andamento, ${r.awaiting_approval} aguardando aprovação).`);
  });

  // Retrabalho elevado
  active.filter((r) => r.rework_percent > 20 && r.closed_in_period >= 2).forEach((r) => {
    risks.push(`${r.full_name} com ${r.rework_percent.toFixed(0)}% de retrabalho.`);
  });

  // Resumos individuais
  active.forEach((r) => {
    const parts: string[] = [];
    if (r.closed_in_period > 0) parts.push(`encerrou ${r.closed_in_period} chamado(s)`);
    if (r.csat_count > 0) parts.push(`CSAT ${Number(r.avg_csat).toFixed(1)}`);
    if (r.rework_count === 0 && r.closed_in_period > 0) parts.push("sem retrabalho");
    else if (r.rework_count > 0) parts.push(`${r.rework_count} retrabalho(s)`);
    if (r.in_progress_now + r.awaiting_approval > 0) parts.push(`${r.in_progress_now + r.awaiting_approval} pendente(s)`);
    if (parts.length > 0) {
      techSummaries[r.user_id] = `${r.full_name} ${parts.join(", ")}.`;
    }
  });

  return { highlights, risks, techSummaries };
}

function partsInTz(d: Date, tz = "America/Sao_Paulo") {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? "";
  return { y: get("year"), m: get("month"), d: get("day") };
}

function ymdInTz(d: Date, tz = "America/Sao_Paulo") {
  const p = partsInTz(d, tz);
  return `${p.y}-${p.m}-${p.d}`;
}

function brDate(d: Date, tz = "America/Sao_Paulo") {
  const p = partsInTz(d, tz);
  return `${p.d}/${p.m}/${p.y}`;
}

function detectPeriodLabel(fromISO: string, toISO: string): { label: string; range: string; kind: "hoje" | "ontem" | "7dias" | "mes" | "custom" } {
  const tz = "America/Sao_Paulo";
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const now = new Date();
  const todayYmd = ymdInTz(now, tz);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayYmd = ymdInTz(yesterday, tz);
  const fromYmd = ymdInTz(from, tz);
  const toYmd = ymdInTz(to, tz);
  const range = `${brDate(from, tz)} → ${brDate(to, tz)}`;

  if (fromYmd === todayYmd && toYmd === todayYmd) return { label: "Hoje", range, kind: "hoje" };
  if (fromYmd === yesterdayYmd && toYmd === yesterdayYmd) return { label: "Ontem", range, kind: "ontem" };

  const diffDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays >= 6 && diffDays <= 8 && toYmd === todayYmd) return { label: "Últimos 7 dias", range, kind: "7dias" };

  const fromP = partsInTz(from, tz);
  const toP = partsInTz(to, tz);
  if (fromP.y === toP.y && fromP.m === toP.m && fromP.d === "01" && Number(toP.d) >= 27) {
    return { label: `Mês ${fromP.m}/${fromP.y}`, range, kind: "mes" };
  }

  return { label: `Período ${range}`, range, kind: "custom" };
}

function buildWhatsappMessage(opts: {
  periodLabel: string;
  range: string;
  totals: {
    closed: number;
    in_progress: number;
    awaiting_approval: number;
    backlog: number;
    csat: number;
    tma_minutes: number;
    points: number;
    rework_percent: number;
  };
  highlights: string[];
  risks: string[];
  opStatus: "normal" | "attention" | "critical";
  organizationName: string | null;
}): string {
  const { periodLabel, range, totals, highlights, risks, opStatus, organizationName } = opts;
  const statusLine = opStatus === "normal" ? "Operação segue estável no período."
    : opStatus === "attention" ? "⚠️ Operação requer atenção no período."
    : "🔴 Operação em estado crítico no período.";

  const lines: string[] = [];
  lines.push(`📊 RESUMO OPERACIONAL${organizationName ? ` — ${organizationName}` : ""} — ${periodLabel}`);
  lines.push(`🗓️ ${range}`);
  lines.push("");
  lines.push(`✅ Chamados Finalizados: ${totals.closed}`);
  lines.push(`🔄 Em Andamento: ${totals.in_progress}`);
  lines.push(`⏳ Aguardando Aprovação: ${totals.awaiting_approval}`);
  lines.push(`📋 Backlog Total: ${totals.backlog}`);
  lines.push("");
  lines.push(`⭐ CSAT Médio: ${totals.csat > 0 ? totals.csat.toFixed(2) : "—"}`);
  lines.push(`⏱️ TMA Médio: ${fmtMinutes(totals.tma_minutes)}`);
  lines.push(`🎯 Pontuação Total: ${totals.points.toFixed(0)}`);
  lines.push(`🔁 Retrabalho: ${totals.rework_percent.toFixed(1)}%`);

  if (highlights.length > 0) {
    lines.push("");
    lines.push("🏆 Destaques:");
    highlights.forEach((h) => lines.push(`• ${h}`));
  }

  if (risks.length > 0) {
    lines.push("");
    lines.push("⚠️ Pontos de atenção:");
    risks.forEach((r) => lines.push(`• ${r}`));
  }

  lines.push("");
  lines.push(statusLine);

  return lines.join("\n");
}

async function generateAiInsights(opts: {
  totals: any;
  highlights: string[];
  risks: string[];
  technicians: MetricRow[];
  periodLabel: string;
  range: string;
  periodKind: "hoje" | "ontem" | "7dias" | "mes" | "custom";
  organizationName: string | null;
  openedInPeriod: number;
  saldoBacklog: number;
  backlogNow: number;
  awaitingNow: number;
  inProgressNow: number;
  typeMix: Record<string, number>;
  priorityMix: Record<string, number>;
  topCategories: { name: string; count: number }[];
  avgStoryPoints: number;
}): Promise<string[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("LOVABLE_API_KEY secret não configurado");
    return [];
  }

  const techSummary = opts.technicians
    .filter((t) => t.closed_in_period > 0 || t.in_progress_now > 0 || t.awaiting_approval > 0)
    .slice(0, 15)
    .map((t) => `- ${t.full_name}: ${t.closed_in_period} fechados, ${t.in_progress_now} em andamento, ${t.awaiting_approval} aguardando, ${t.total_assigned} atribuídos, CSAT ${Number(t.avg_csat).toFixed(1)} (${t.csat_count} aval.), retrabalho ${t.rework_percent.toFixed(0)}% (${t.rework_count}), TMA ${Math.round(Number(t.avg_handle_minutes))}min, ${Number(t.points).toFixed(0)} pts`)
    .join("\n");

  const typeMixStr = Object.entries(opts.typeMix).map(([k, v]) => `${k}: ${v}`).join(", ") || "sem dados";
  const prioMixStr = Object.entries(opts.priorityMix).map(([k, v]) => `${k}: ${v}`).join(", ") || "sem dados";
  const catsStr = opts.topCategories.map((c) => `${c.name} (${c.count})`).join(", ") || "sem dados";
  const awaitPct = opts.backlogNow > 0 ? (opts.awaitingNow / opts.backlogNow) * 100 : 0;

  const nextActionHint =
    opts.periodKind === "hoje" ? "ação específica até o fim do expediente de hoje"
    : opts.periodKind === "ontem" ? "ação corretiva a executar hoje com base no que ocorreu ontem"
    : opts.periodKind === "7dias" ? "ação para a próxima semana operacional"
    : opts.periodKind === "mes" ? "ação estratégica para o próximo ciclo mensal"
    : "próxima ação prática no período seguinte";

  const prompt = `Você é analista executivo de operações de TI (helpdesk). Analise o desempenho da operação${opts.organizationName ? ` da ${opts.organizationName}` : ""} no período **${opts.periodLabel}** (${opts.range}). Os números abaixo vêm do mesmo pipeline do Painel de TV.

Gere de 5 a 7 insights, em português, cada um com 1 a 2 frases. SEMPRE combine número + interpretação — não apenas repita o número. Cite nomes reais de técnicos e categorias. Proibido: "continue assim", "bom trabalho", "manter o ritmo", "parabéns à equipe" ou qualquer elogio vazio.

ROTEIRO OBRIGATÓRIO (na ordem):
1. VOLUME E RITMO — comparar abertos (${opts.openedInPeriod}) vs fechados (${opts.totals.closed}) no período. Saldo do backlog no período: ${opts.saldoBacklog >= 0 ? "+" : ""}${opts.saldoBacklog}. Interpretar se o time está drenando ou acumulando fila.
2. QUALIDADE — cruzar CSAT (${opts.totals.csat > 0 ? opts.totals.csat.toFixed(2) : "sem avaliações"}${opts.totals.csat > 0 ? `, base ${opts.technicians.reduce((s, t) => s + Number(t.csat_count || 0), 0)} avaliações` : ""}) com retrabalho (${opts.totals.rework_percent.toFixed(1)}%). Se um dos dois estiver zerado/insuficiente, diga explicitamente.
3. PRODUTIVIDADE INDIVIDUAL — destaque os 2 técnicos com mais fechamentos e QUALQUER técnico em risco (retrabalho >15%, CSAT <3.5 com ≥2 avaliações, ou pendentes ≥ 5).
4. COMPOSIÇÃO DA DEMANDA — mix por tipo (${typeMixStr}), top categorias (${catsStr}) e complexidade média (story points ${opts.avgStoryPoints.toFixed(2)} — leve <3, médio 3-5, pesado >5).
5. PRIORIDADES — distribuição nos fechados (${prioMixStr}). Sinalizar se Alta/Crítica dominar.
6. BACKLOG E APROVAÇÃO — backlog atual ${opts.backlogNow}, com ${opts.awaitingNow} aguardando aprovação (${awaitPct.toFixed(0)}% do backlog) e ${opts.inProgressNow} em andamento.${awaitPct > 30 ? " Como aguardando aprovação passa de 30%, tratar como gargalo de aprovação." : ""}
7. RECOMENDAÇÃO — uma ${nextActionHint}, concreta e nominal (quem, o quê, quando).

REGRAS:
- Não invente números.
- Se um campo estiver zerado, diga que está zerado; não fabrique tendências.
- Não repita as mesmas frases já detectadas nos destaques/riscos abaixo; use-os como base.

DADOS:
Totais no período: ${JSON.stringify(opts.totals)}
Abertos no período: ${opts.openedInPeriod} | Fechados no período: ${opts.totals.closed} | Saldo backlog: ${opts.saldoBacklog >= 0 ? "+" : ""}${opts.saldoBacklog}
Backlog atual: ${opts.backlogNow} (${opts.awaitingNow} aguardando aprovação, ${opts.inProgressNow} em andamento)
Mix por tipo (abertos): ${typeMixStr}
Mix por prioridade (fechados): ${prioMixStr}
Média de story points (fechados): ${opts.avgStoryPoints.toFixed(2)}
Top categorias: ${catsStr}
Destaques pré-detectados: ${opts.highlights.join("; ") || "nenhum"}
Riscos pré-detectados: ${opts.risks.join("; ") || "nenhum"}

Técnicos ativos:
${techSummary || "sem atividade"}

Responda APENAS um JSON: {"insights": ["frase 1", "frase 2", ...]}`;

  try {
    const aiRes = await streamLovableResponse({
      apiKey,
      model: "openai/gpt-5.6-terra",
      input: [
        { role: "system", content: "Você é um analista executivo sênior de operações de TI. Escreva em português, tom executivo, direto e específico. Combine sempre número com interpretação. Nunca elogios vazios." },
        { role: "user", content: prompt },
      ],
      textFormat: { type: "json_object" },
    });
    if (!aiRes.ok) {
      console.warn("Lovable AI gateway non-ok", aiRes.status, aiRes.body);
      return [];
    }
    const content = aiRes.text;
    if (!content) return [];
    const parsed = JSON.parse(content);
    return Array.isArray(parsed?.insights) ? parsed.insights.slice(0, 8) : [];
  } catch (e) {
    console.warn("AI insights error", e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body.organization_id || !body.from || !body.to) {
      return new Response(JSON.stringify({ error: "organization_id, from, to são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Cache check
    if (!body.force) {
      const { data: cached } = await supabase
        .from("daily_insights_cache")
        .select("*")
        .eq("organization_id", body.organization_id)
        .eq("reference_from", body.from)
        .eq("reference_to", body.to)
        .maybeSingle();
      if (cached) {
        return new Response(JSON.stringify({
          insights: cached.insights,
          highlights: cached.highlights,
          risks: cached.risks,
          technician_summaries: cached.technician_summaries,
          whatsapp_message: cached.whatsapp_message,
          op_status: cached.op_status,
          cached: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Metrics
    const { data: rows, error: rpcErr } = await supabase.rpc("get_management_metrics_admin", {
      _from: body.from,
      _to: body.to,
      _organization_id: body.organization_id,
    });
    if (rpcErr) throw rpcErr;

    const list = (rows ?? []) as MetricRow[];

    // Overview (backlog atual)
    const { data: ov } = await supabase.rpc("get_executive_overview", {
      _organization_id: body.organization_id,
    });
    const overview = (Array.isArray(ov) ? ov[0] : ov) as Overview | null;

    // Org
    const { data: org } = await supabase
      .from("organizations").select("name").eq("id", body.organization_id).maybeSingle();

    // Totals
    const totals = list.reduce((acc, r) => {
      acc.closed += Number(r.closed_in_period || 0);
      acc.inProg += Number(r.in_progress_now || 0);
      acc.await += Number(r.awaiting_approval || 0);
      acc.points += Number(r.points || 0);
      acc.rework += Number(r.rework_count || 0);
      acc.csatSum += Number(r.avg_csat || 0) * Number(r.csat_count || 0);
      acc.csatCount += Number(r.csat_count || 0);
      acc.handleSum += Number(r.avg_handle_minutes || 0) * Number(r.closed_in_period || 0);
      acc.handleW += Number(r.closed_in_period || 0);
      return acc;
    }, { closed: 0, inProg: 0, await: 0, points: 0, rework: 0, csatSum: 0, csatCount: 0, handleSum: 0, handleW: 0 });

    const avgCsat = totals.csatCount > 0 ? totals.csatSum / totals.csatCount : 0;
    const avgHandle = totals.handleW > 0 ? totals.handleSum / totals.handleW : 0;
    const reworkPct = totals.closed > 0 ? (totals.rework / totals.closed) * 100 : 0;
    const backlogTotal = overview?.backlog_total ?? (totals.inProg + totals.await);

    const opStatus = computeOpStatus({
      backlogTotal,
      awaitingApproval: overview?.awaiting_approval_count ?? totals.await,
      reworkPercent: reworkPct,
      avgCsat,
      csatCount: totals.csatCount,
    });

    const { highlights, risks, techSummaries } = buildHighlights(list);

    // Add backlog-based risks
    if (overview && overview.awaiting_approval_count >= 10) {
      risks.unshift(`${overview.awaiting_approval_count} chamados aguardando aprovação no backlog.`);
    }

    const period = detectPeriodLabel(body.from, body.to);

    // Extra dimensions: type/priority mix, top categories, story points, opened count
    const { data: periodTickets } = await supabase
      .from("tickets")
      .select("id, type, priority, story_points, category_id, status, closed_at, created_at")
      .eq("organization_id", body.organization_id)
      .gte("created_at", body.from)
      .lt("created_at", body.to);

    const openedInPeriod = (periodTickets ?? []).length;
    const typeMix: Record<string, number> = {};
    (periodTickets ?? []).forEach((t: any) => {
      const k = (t.type as string) || "Outro";
      typeMix[k] = (typeMix[k] ?? 0) + 1;
    });

    const { data: closedPeriod } = await supabase
      .from("tickets")
      .select("id, priority, story_points, category_id")
      .eq("organization_id", body.organization_id)
      .eq("status", "Fechado")
      .gte("closed_at", body.from)
      .lt("closed_at", body.to);

    const priorityMix: Record<string, number> = {};
    let spSum = 0, spCount = 0;
    const catIds = new Set<string>();
    (closedPeriod ?? []).forEach((t: any) => {
      const p = (t.priority as string) || "—";
      priorityMix[p] = (priorityMix[p] ?? 0) + 1;
      if (t.story_points != null) { spSum += Number(t.story_points); spCount++; }
      if (t.category_id) catIds.add(t.category_id);
    });
    const avgStoryPoints = spCount > 0 ? spSum / spCount : 0;

    const catCount: Record<string, number> = {};
    (closedPeriod ?? []).forEach((t: any) => {
      if (t.category_id) catCount[t.category_id] = (catCount[t.category_id] ?? 0) + 1;
    });
    let topCategories: { name: string; count: number }[] = [];
    if (catIds.size > 0) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name")
        .in("id", [...catIds]);
      const nameMap = new Map((cats ?? []).map((c: any) => [c.id, c.name]));
      topCategories = Object.entries(catCount)
        .map(([id, count]) => ({ name: nameMap.get(id) ?? "—", count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    const saldoBacklog = openedInPeriod - totals.closed;

    const totalsForMsg = {
      closed: totals.closed,
      in_progress: overview?.in_progress_count ?? totals.inProg,
      awaiting_approval: overview?.awaiting_approval_count ?? totals.await,
      backlog: backlogTotal,
      csat: avgCsat,
      tma_minutes: avgHandle,
      points: totals.points,
      rework_percent: reworkPct,
    };

    const whatsappMessage = buildWhatsappMessage({
      periodLabel: period.label,
      range: period.range,
      totals: totalsForMsg,
      highlights,
      risks,
      opStatus,
      organizationName: org?.name ?? null,
    });

    // AI insights (best-effort)
    const aiInsights = await generateAiInsights({
      totals: totalsForMsg,
      highlights,
      risks,
      technicians: list,
      periodLabel: period.label,
      range: period.range,
      periodKind: period.kind,
      organizationName: org?.name ?? null,
      openedInPeriod,
      saldoBacklog,
      backlogNow: backlogTotal,
      awaitingNow: overview?.awaiting_approval_count ?? totals.await,
      inProgressNow: overview?.in_progress_count ?? totals.inProg,
      typeMix,
      priorityMix,
      topCategories,
      avgStoryPoints,
    });



    // Cache
    await supabase
      .from("daily_insights_cache")
      .upsert({
        organization_id: body.organization_id,
        reference_from: body.from,
        reference_to: body.to,
        insights: aiInsights,
        highlights,
        risks,
        technician_summaries: techSummaries,
        whatsapp_message: whatsappMessage,
        op_status: opStatus,
      }, { onConflict: "organization_id,reference_from,reference_to" });

    return new Response(JSON.stringify({
      insights: aiInsights,
      highlights,
      risks,
      technician_summaries: techSummaries,
      whatsapp_message: whatsappMessage,
      op_status: opStatus,
      cached: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("generate-executive-summary error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
