import { createClient } from "npm:@supabase/supabase-js@2";
import {
  ORG_TZ,
  localDateInTz,
  startOfDayInTz,
  startOfMonthInTz,
  addDaysInTz,
  addMonthsInTz,
  wallPartsInTz,
  weekdayInTz,
} from "./tz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BUSINESS_START = 8;
const BUSINESS_END = 18;

function calcBusinessMinutes(start: Date, end: Date): number {
  if (end <= start) return 0;
  let total = 0;
  let cur = startOfDayInTz(start);
  const endDay = startOfDayInTz(end);
  while (cur.getTime() <= endDay.getTime()) {
    const dw = weekdayInTz(cur);
    if (dw >= 1 && dw <= 5) {
      const { y, m, d } = wallPartsInTz(cur);
      const ds = localDateInTz(y, m, d, BUSINESS_START, 0, 0, 0);
      const de = localDateInTz(y, m, d, BUSINESS_END, 0, 0, 0);
      const os = start > ds ? start : ds;
      const oe = end < de ? end : de;
      if (os < oe) total += (oe.getTime() - os.getTime()) / 60000;
    }
    cur = addDaysInTz(cur, 1);
  }
  return total;
}

const SLA_THRESHOLDS: Record<string, { warn: number; crit: number }> = {
  Urgente: { warn: 4, crit: 8 },
  Alta: { warn: 8, crit: 16 },
  Média: { warn: 16, crit: 32 },
  Baixa: { warn: 32, crit: 80 },
};

function slaStatus(mins: number, priority: string): "ok" | "warn" | "crit" {
  const t = SLA_THRESHOLDS[priority] ?? SLA_THRESHOLDS["Média"];
  if (mins >= t.crit * 60) return "crit";
  if (mins >= t.warn * 60) return "warn";
  return "ok";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("org");
    const token = url.searchParams.get("token");
    if (!slug || !token) {
      return new Response(JSON.stringify({ error: "Missing org or token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = Deno.env.get("TV_DASHBOARD_TOKEN");
    if (!expected || token !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: org } = await supabase
      .from("organizations").select("id, name, slug").eq("slug", slug).maybeSingle();
    if (!org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const orgId = org.id;

    const now = new Date();
    const startToday = startOfDayInTz(now);
    const startMonth = startOfMonthInTz(now);
    const endMonth = addMonthsInTz(now, 1);

    // Optional agenda range (defaults to today when omitted), interpreted in ORG_TZ
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    let agendaStart = startToday;
    let agendaEnd = addDaysInTz(startToday, 1);
    if (fromParam && toParam) {
      const fm = fromParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const tm = toParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (fm && tm) {
        agendaStart = localDateInTz(+fm[1], +fm[2], +fm[3], 0, 0, 0, 0);
        const tEnd = localDateInTz(+tm[1], +tm[2], +tm[3], 0, 0, 0, 0);
        agendaEnd = addDaysInTz(tEnd, 1);
      }
    }

    // Fetch tickets in two focused queries to avoid PostgREST's 1000-row default
    // truncating results on large orgs. Together they cover every KPI the loop
    // computes: open* uses aging/backlog; recent* uses closed/opened/tma/ranking.
    const selectCols = "id, title, status, priority, created_at, started_at, closed_at, aguardando_aprovacao_at, assigned_to, created_by, category_id";
    const startMonthIso = startMonth.toISOString();
    const [openRes, recentRes] = await Promise.all([
      supabase
        .from("tickets")
        .select(selectCols)
        .eq("organization_id", orgId)
        .not("status", "in", '("Fechado","Aprovado")')
        .order("created_at", { ascending: false }),
      supabase
        .from("tickets")
        .select(selectCols)
        .eq("organization_id", orgId)
        .or(`created_at.gte.${startMonthIso},closed_at.gte.${startMonthIso},aguardando_aprovacao_at.gte.${startMonthIso}`)
        .order("created_at", { ascending: false }),
    ]);
    const byId = new Map<string, any>();
    for (const t of (openRes.data ?? [])) byId.set(t.id, t);
    for (const t of (recentRes.data ?? [])) if (!byId.has(t.id)) byId.set(t.id, t);
    const list = Array.from(byId.values());


    // Collect IDs for lookups
    const userIds = new Set<string>();
    const catIds = new Set<string>();
    const ticketIds: string[] = [];
    for (const t of list) {
      if (t.assigned_to) userIds.add(t.assigned_to);
      if (t.created_by) userIds.add(t.created_by);
      if (t.category_id) catIds.add(t.category_id);
      ticketIds.push(t.id);
    }

    const [{ data: profiles }, { data: cats }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name").in("user_id", Array.from(userIds).length ? Array.from(userIds) : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("categories").select("id, name").in("id", Array.from(catIds).length ? Array.from(catIds) : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("ticket_history")
        .select("ticket_id, new_value, created_at")
        .in("ticket_id", ticketIds.length ? ticketIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("action", "status_change")
        .eq("new_value", "Aguardando Aprovação")
        .order("created_at", { ascending: true }),
    ]);
    const nameOf = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
    const catOf = new Map((cats ?? []).map((c: any) => [c.id, c.name]));
    // Primeiro momento em que o técnico finalizou o atendimento (foi para "Aguardando Aprovação")
    const finishedAt = new Map<string, Date>();
    for (const h of (history ?? []) as any[]) {
      if (!finishedAt.has(h.ticket_id)) finishedAt.set(h.ticket_id, new Date(h.created_at));
    }

    // KPIs
    let closed_today = 0, closed_month = 0, opened_today = 0;
    let in_progress = 0, open_count = 0, awaiting = 0, backlog = 0;
    let tmaSum = 0, tmaN = 0;
    let tmaMonthSum = 0, tmaMonthN = 0;
    let tmaTodaySum = 0, tmaTodayN = 0;
    let frSum = 0, frN = 0;
    let agingSum = 0, agingN = 0;
    const activeTechsToday = new Set<string>();
    const todayTickets: any[] = [];

    for (const t of list) {
      const createdAt = new Date(t.created_at);
      const isCreatedToday = createdAt >= startToday;
      if (isCreatedToday) opened_today++;

      // Momento efetivo de finalização pelo técnico:
      // 1) Aguardando Aprovação (fluxo normal), OU
      // 2) closed_at quando o ticket foi Fechado/Aprovado direto (ex.: fechamento de sprint)
      const aad = t.aguardando_aprovacao_at ? new Date(t.aguardando_aprovacao_at) : null;
      const closedAt = t.closed_at ? new Date(t.closed_at) : null;
      const isFinal = t.status === "Fechado" || t.status === "Aprovado";
      const effectiveFinish = aad ?? (isFinal ? closedAt : null);

      if (effectiveFinish) {
        if (effectiveFinish >= startToday) {
          closed_today++;
          if (t.assigned_to) activeTechsToday.add(t.assigned_to);
        }
        if (effectiveFinish >= startMonth && effectiveFinish < endMonth) closed_month++;
      }

      // TMA = tempo corrido entre started_at e a finalização efetiva,
      // considerando apenas chamados abertos e finalizados no mesmo dia civil.
      const finished = finishedAt.get(t.id) ?? effectiveFinish;
      if (t.started_at && finished) {
        const createdParts = wallPartsInTz(new Date(t.created_at));
        const finishedParts = wallPartsInTz(finished);
        const sameDay = createdParts.y === finishedParts.y && createdParts.m === finishedParts.m && createdParts.d === finishedParts.d;
        if (sameDay) {
          const m = (finished.getTime() - new Date(t.started_at).getTime()) / 60000;
          if (m > 0) {
            tmaSum += m; tmaN++;
            if (finished >= startMonth && finished < endMonth) { tmaMonthSum += m; tmaMonthN++; }
            if (finished >= startToday) { tmaTodaySum += m; tmaTodayN++; }
          }
        }
      }

      if (t.status !== "Fechado" && t.status !== "Aprovado") {

        backlog++;
        if (t.status === "Em Andamento") { in_progress++; if (t.assigned_to) activeTechsToday.add(t.assigned_to); }
        else if (t.status === "Aberto") open_count++;
        else if (t.status === "Aguardando Aprovação") awaiting++;
        const am = calcBusinessMinutes(createdAt, now);
        if (am > 0) { agingSum += am; agingN++; }
      }
      if (t.started_at) {
        const sd = new Date(t.started_at);
        if (sd >= startMonth && sd < endMonth) {
          const fm = calcBusinessMinutes(new Date(t.created_at), sd);
          if (fm >= 0) { frSum += fm; frN++; }
        }
      }

      // Agenda tickets: apenas chamados CRIADOS no período selecionado
      const createdInRange = createdAt >= agendaStart && createdAt < agendaEnd;
      if (createdInRange) {
        const wp = wallPartsInTz(createdAt);
        const mo = String(wp.m).padStart(2, "0");
        const da = String(wp.d).padStart(2, "0");
        const hh = String(wp.hh).padStart(2, "0");
        const mm = String(wp.mm).padStart(2, "0");
        todayTickets.push({
          id: t.id,
          code: String(t.id).slice(0, 4).toUpperCase(),
          title: t.title,
          priority: t.priority,
          status: t.status,
          date: `${wp.y}-${mo}-${da}`,
          hour: `${hh}:${mm}`,
          technician: t.assigned_to ? (nameOf.get(t.assigned_to) ?? null) : null,
        });
      }
    }
    todayTickets.sort((a, b) => (a.date + a.hour).localeCompare(b.date + b.hour));

    // CSAT do mês vigente (apenas satisfaction)
    const { data: evalsMonth } = await supabase
      .from("evaluations").select("score, ticket_id, created_at, type, tickets!inner(organization_id)")
      .gte("created_at", startMonth.toISOString())
      .lt("created_at", endMonth.toISOString())
      .eq("type", "satisfaction")
      .eq("tickets.organization_id", orgId);
    let csatSum = 0, csatN = 0;
    let csatTodaySum = 0, csatTodayN = 0;
    for (const e of evalsMonth ?? []) {
      const s = (e as any).score ?? 0;
      csatSum += s; csatN++;
      if (new Date((e as any).created_at) >= startToday) { csatTodaySum += s; csatTodayN++; }
    }
    const csat = csatN ? csatSum / csatN : 0;
    const csatToday = csatTodayN ? csatTodaySum / csatTodayN : 0;

    // Open queue
    const openList = list.filter(t => t.status === "Aberto")
      .map(t => {
        const created = new Date(t.created_at);
        const waitingMin = calcBusinessMinutes(created, now);
        return {
          id: t.id, title: t.title, priority: t.priority,
          category: catOf.get(t.category_id) ?? "—",
          requester: nameOf.get(t.created_by) ?? "—",
          waiting_min: Math.round(waitingMin),
          sla: slaStatus(waitingMin, t.priority),
          created_at: t.created_at,
        };
      })
      .sort((a, b) => b.waiting_min - a.waiting_min)
      .slice(0, 20);

    // In progress
    const progList = list.filter(t => t.status === "Em Andamento")
      .map(t => {
        const start = t.started_at ? new Date(t.started_at) : new Date(t.created_at);
        const elapsed = calcBusinessMinutes(start, now);
        return {
          id: t.id, title: t.title, priority: t.priority,
          category: catOf.get(t.category_id) ?? "—",
          technician: nameOf.get(t.assigned_to) ?? "—",
          elapsed_min: Math.round(elapsed),
          sla: slaStatus(elapsed, t.priority),
        };
      })
      .sort((a, b) => b.elapsed_min - a.elapsed_min)
      .slice(0, 20);

    // Ranking today (usa finalização efetiva: aguardando_aprovacao_at OU closed_at para fechados diretos)
    const rankMap = new Map<string, { fechados: number }>();
    for (const t of list) {
      const aad = t.aguardando_aprovacao_at ? new Date(t.aguardando_aprovacao_at) : null;
      const isFinal = t.status === "Fechado" || t.status === "Aprovado";
      const eff = aad ?? (isFinal && t.closed_at ? new Date(t.closed_at) : null);
      if (eff && eff >= startToday && t.assigned_to) {
        const r = rankMap.get(t.assigned_to) ?? { fechados: 0 };
        r.fechados++;
        rankMap.set(t.assigned_to, r);
      }
    }
    const ranking = Array.from(rankMap.entries())
      .map(([id, r]) => ({ id, name: nameOf.get(id) ?? "—", fechados: r.fechados }))
      .sort((a, b) => b.fechados - a.fechados)
      .slice(0, 5);

    const active_techs = new Set<string>();
    for (const t of list) {
      if (t.status === "Em Andamento" && t.assigned_to) active_techs.add(t.assigned_to);
    }

    // Equipe agora: todos os técnicos da organização
    const { data: techRoles } = await supabase
      .from("user_organization_roles")
      .select("user_id")
      .eq("organization_id", orgId)
      .in("role", ["tecnico", "desenvolvedor"]);
    const techIds = Array.from(new Set((techRoles ?? []).map((r: any) => r.user_id)));
    const { data: techProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", techIds.length ? techIds : ["00000000-0000-0000-0000-000000000000"]);
    const techNameOf = new Map((techProfiles ?? []).map((p: any) => [p.user_id, p.full_name]));

    // Demandas de projeto: tarefas em "Em Desenvolvimento" atribuídas ao dev
    // (assignee_id quando existir, senão quem fez a última mudança de status)
    const { data: devTasks } = await supabase
      .from("project_tasks")
      .select("id, title, assignee_id")
      .eq("organization_id", orgId)
      .eq("status", "Em Desenvolvimento");
    const devTaskIds = (devTasks ?? []).map((t: any) => t.id);
    const { data: devHist } = await supabase
      .from("task_status_history")
      .select("task_id, changed_by, changed_at")
      .in("task_id", devTaskIds.length ? devTaskIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("new_status", "Em Desenvolvimento")
      .order("changed_at", { ascending: true });
    const lastChangerOf = new Map<string, string>();
    for (const h of (devHist ?? []) as any[]) {
      if (h.changed_by) lastChangerOf.set(h.task_id, h.changed_by);
    }

    type TeamAgg = {
      closed_today: number;
      in_progress: number;
      unstarted: number;
      projects_in_dev: number;
      closed_titles: string[];
      in_progress_titles: string[];
      unstarted_titles: string[];
      project_titles: string[];
    };
    const teamAgg = new Map<string, TeamAgg>();
    for (const id of techIds) teamAgg.set(id, { closed_today: 0, in_progress: 0, unstarted: 0, projects_in_dev: 0, closed_titles: [], in_progress_titles: [], unstarted_titles: [], project_titles: [] });
    for (const t of list) {
      if (!t.assigned_to) continue;
      const agg = teamAgg.get(t.assigned_to);
      if (!agg) continue;
      const aad = t.aguardando_aprovacao_at ? new Date(t.aguardando_aprovacao_at) : null;
      const isFinal = t.status === "Fechado" || t.status === "Aprovado";
      const eff = aad ?? (isFinal && t.closed_at ? new Date(t.closed_at) : null);
      if (eff && eff >= startToday) {
        agg.closed_today++;
        if (agg.closed_titles.length < 12) agg.closed_titles.push(t.title ?? "—");
      }
      if (t.status === "Em Andamento") {
        agg.in_progress++;
        if (agg.in_progress_titles.length < 12) agg.in_progress_titles.push(t.title ?? "—");
      }
      if (t.status === "Aberto") {
        agg.unstarted++;
        if (agg.unstarted_titles.length < 12) agg.unstarted_titles.push(t.title ?? "—");
      }
    }
    for (const task of (devTasks ?? []) as any[]) {
      const owner = task.assignee_id ?? lastChangerOf.get(task.id);
      if (!owner) continue;
      const agg = teamAgg.get(owner);
      if (!agg) continue;
      agg.projects_in_dev++;
      if (agg.project_titles.length < 12) agg.project_titles.push(task.title ?? "—");
    }
    const team_status = techIds
      .map((id) => {
        const a = teamAgg.get(id)!;
        return {
          id,
          name: techNameOf.get(id) ?? "—",
          closed_today: a.closed_today,
          in_progress: a.in_progress,
          unstarted: a.unstarted,
          projects_in_dev: a.projects_in_dev,
          idle: a.in_progress === 0 && a.projects_in_dev === 0,
          closed_titles: a.closed_titles,
          in_progress_titles: a.in_progress_titles,
          unstarted_titles: a.unstarted_titles,
          project_titles: a.project_titles,
        };
      })
      .sort((a, b) => (a.idle === b.idle ? b.closed_today - a.closed_today : a.idle ? 1 : -1));



    // SLA alerts
    const slaAlerts = [...openList, ...progList]
      .filter(x => x.sla !== "ok")
      .map(x => ({ id: x.id, title: x.title, priority: x.priority, sla: x.sla, minutes: (x as any).waiting_min ?? (x as any).elapsed_min }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);

    // Preventivas do mês
    const { data: prev } = await supabase
      .from("preventive_maintenance")
      .select("id, execution_date")
      .eq("organization_id", orgId)
      .gte("execution_date", startMonth.toISOString().slice(0, 10))
      .lt("execution_date", endMonth.toISOString().slice(0, 10));
    const prevDone = (prev ?? []).length;

    const { data: intervals } = await supabase
      .from("maintenance_intervals").select("equipment_type, interval_days");
    const { data: patrimonio } = await supabase
      .from("patrimonio").select("id, asset_tag, equipment_type")
      .eq("organization_id", orgId)
      .eq("status", "Ativo");
    const { data: allPrev } = await supabase
      .from("preventive_maintenance")
      .select("asset_tag, execution_date")
      .eq("organization_id", orgId);
    const lastByTag = new Map<string, string>();
    for (const p of allPrev ?? []) {
      const tag = (p as any).asset_tag;
      const d = (p as any).execution_date;
      if (!tag || !d) continue;
      const prev = lastByTag.get(tag);
      if (!prev || d > prev) lastByTag.set(tag, d);
    }
    const intervalMap = new Map((intervals ?? []).map((i: any) => [i.equipment_type, i.interval_days]));
    let prevTotal = 0, prevOverdue = 0;
    for (const p of patrimonio ?? []) {
      const days = intervalMap.get((p as any).equipment_type);
      if (!days) continue;
      prevTotal++;
      const lastStr = lastByTag.get((p as any).asset_tag);
      const nextDue = lastStr ? new Date(new Date(lastStr).getTime() + days * 86400000) : null;
      if (!nextDue || nextDue < now) prevOverdue++;
    }
    const prevPendente = Math.max(0, prevTotal - prevDone);

    // Goals summary (metas dos técnicos + reais do mês)
    const { y, m } = wallPartsInTz(now);
    const { data: goalsSummary } = await supabase.rpc("get_tv_goals_summary", {
      _organization_id: orgId, _year: y, _month: m,
    });

    const body = {
      org: { id: orgId, name: org.name, slug: org.slug },
      generated_at: now.toISOString(),
      kpis: {
        closed_today, closed_month, opened_today,
        in_progress, open: open_count, awaiting, backlog,
        csat: Number(csat.toFixed(2)), csat_count: csatN,
        csat_today: Number(csatToday.toFixed(2)), csat_today_count: csatTodayN,
        tma_minutes: tmaN ? Math.round(tmaSum / tmaN) : 0,
        tma_month_minutes: tmaMonthN ? Math.round(tmaMonthSum / tmaMonthN) : 0,
        tma_today_minutes: tmaTodayN ? Math.round(tmaTodaySum / tmaTodayN) : 0,
        active_techs: active_techs.size,
        active_techs_today: activeTechsToday.size,
        first_response_min: frN ? Math.round(frSum / frN) : 0,
        aging_min: agingN ? Math.round(agingSum / agingN) : 0,
      },
      open_queue: openList,
      in_progress_list: progList,
      ranking_today: ranking,
      team_status,
      today_tickets: todayTickets,
      sla_alerts: slaAlerts,
      preventivas_month: { total: prevTotal, feitas: prevDone, pendentes: prevPendente, atrasadas: prevOverdue },
      goals_summary: goalsSummary ?? null,
    };

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("tv-dashboard error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
