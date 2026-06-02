import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  organization_id: string;
  from?: string; // ISO timestamp
  to?: string;   // ISO timestamp
  dry_run?: boolean;
}

const DEFAULT_TZ = "America/Sao_Paulo";

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function tzOffsetMinutes(tz: string, instant: Date): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, timeZoneName: "shortOffset",
  }).formatToParts(instant).find((p) => p.type === "timeZoneName")?.value ?? "GMT-3";
  const m = s.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (!m) return -180;
  const sign = m[1].startsWith("-") ? -1 : 1;
  const h = Math.abs(Number(m[1]));
  const mm = m[2] ? Number(m[2]) : 0;
  return sign * (h * 60 + mm);
}

function localDateInTz(y: number, mo: number, d: number, hh: number, mi: number, ss: number, ms: number, tz: string): Date {
  const guess = new Date(Date.UTC(y, mo - 1, d, hh, mi, ss, ms));
  const offset = tzOffsetMinutes(tz, guess);
  return new Date(guess.getTime() - offset * 60_000);
}

/** D-1 no fuso `tz`: ontem 00:00:00.000 → 23:59:59.999. Retorna ISO em UTC. */
function dMinusOneRange(tz: string = DEFAULT_TZ) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const y = get("year"), m = get("month"), d = get("day");
  const todayUtc = new Date(Date.UTC(y, m - 1, d));
  todayUtc.setUTCDate(todayUtc.getUTCDate() - 1);
  const yy = todayUtc.getUTCFullYear();
  const mm = todayUtc.getUTCMonth() + 1;
  const dd = todayUtc.getUTCDate();
  const from = localDateInTz(yy, mm, dd, 0, 0, 0, 0, tz).toISOString();
  const to = localDateInTz(yy, mm, dd, 23, 59, 59, 999, tz).toISOString();
  return { from, to, tz, date: `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body.organization_id) {
      return new Response(JSON.stringify({ error: "organization_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load config
    const { data: config, error: cfgErr } = await supabase
      .from("management_report_config")
      .select("*")
      .eq("organization_id", body.organization_id)
      .maybeSingle();
    if (cfgErr) throw cfgErr;
    if (!body.dry_run) {
      if (!config) {
        return new Response(JSON.stringify({ error: "config not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!config.webhook_url) {
        return new Response(JSON.stringify({ error: "webhook_url not set" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const configuredTz = config.timezone && isValidTimezone(config.timezone) ? config.timezone : DEFAULT_TZ;
    const range = body.from && body.to
      ? { from: body.from, to: body.to, tz: configuredTz }
      : dMinusOneRange(configuredTz);

    // Get org name
    const { data: org } = await supabase
      .from("organizations").select("name, slug").eq("id", body.organization_id).maybeSingle();

    // Call RPC as service role (bypass SECURITY DEFINER's auth.uid() org lookup by passing org id explicitly).
    // Since the function checks is_super_admin for using _organization_id, we need a workaround: query directly.
    // Easier: run the RPC via SQL using the service role bypassing the org guard via direct query is not supported
    // through PostgREST. Instead, replicate the query here using a SQL view-like approach: call the RPC and
    // pass _organization_id. For service-role this works because we re-call as authenticated would not.
    // Workaround: temporarily switch role using a wrapping RPC. We'll re-fetch by calling the public function
    // and rely on a separate service-callable function.
    const { data: rows, error: rpcErr } = await supabase.rpc("get_management_metrics_admin", {
      _from: range.from,
      _to: range.to,
      _organization_id: body.organization_id,
    });
    if (rpcErr) throw rpcErr;

    // Compute totals
    const list = (rows ?? []) as any[];
    const totals = list.reduce(
      (acc, r) => {
        acc.closed_in_period += Number(r.closed_in_period || 0);
        acc.in_progress_now += Number(r.in_progress_now || 0);
        acc.total_assigned += Number(r.total_assigned || 0);
        acc.awaiting_approval += Number(r.awaiting_approval || 0);
        acc.points += Number(r.points || 0);
        acc.rework_count += Number(r.rework_count || 0);
        acc.csat_sum += Number(r.avg_csat || 0) * Number(r.csat_count || 0);
        acc.csat_count += Number(r.csat_count || 0);
        acc.handle_sum += Number(r.avg_handle_minutes || 0) * Number(r.closed_in_period || 0);
        acc.handle_weight += Number(r.closed_in_period || 0);
        return acc;
      },
      { closed_in_period: 0, in_progress_now: 0, total_assigned: 0, awaiting_approval: 0,
        points: 0, rework_count: 0, csat_sum: 0, csat_count: 0, handle_sum: 0, handle_weight: 0 }
    );

    const payload = {
      organization_id: body.organization_id,
      organization_name: org?.name ?? null,
      period: range,
      generated_at: new Date().toISOString(),
      totals: {
        closed_in_period: totals.closed_in_period,
        in_progress_now: totals.in_progress_now,
        total_assigned: totals.total_assigned,
        awaiting_approval: totals.awaiting_approval,
        points: totals.points,
        rework_count: totals.rework_count,
        rework_percent: totals.closed_in_period > 0
          ? Math.round((totals.rework_count / totals.closed_in_period) * 10000) / 100
          : 0,
        avg_csat: totals.csat_count > 0
          ? Math.round((totals.csat_sum / totals.csat_count) * 100) / 100
          : 0,
        csat_count: totals.csat_count,
        avg_handle_minutes: totals.handle_weight > 0
          ? Math.round((totals.handle_sum / totals.handle_weight) * 100) / 100
          : 0,
      },
      technicians: list,
    };

    if (body.dry_run) {
      return new Response(JSON.stringify({ ok: true, payload }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(config.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const respText = await res.text();

    await supabase
      .from("management_report_config")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("organization_id", body.organization_id);

    return new Response(JSON.stringify({
      ok: res.ok, status: res.status, webhook_response: respText.slice(0, 500), payload,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-management-report error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
