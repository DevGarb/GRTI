import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  organization_id: string;
  from?: string; // ISO timestamp
  to?: string;   // ISO timestamp
  dry_run?: boolean;
}

function dMinusOneRange(tz = "America/Sao_Paulo") {
  // Compute "yesterday" 00:00:00 to 23:59:59.999 in the given timezone as UTC ISO strings.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const y = get("year"), m = get("month"), d = get("day");
  // Yesterday in local tz
  const todayLocal = new Date(Date.UTC(y, m - 1, d));
  todayLocal.setUTCDate(todayLocal.getUTCDate() - 1);
  const yy = todayLocal.getUTCFullYear();
  const mm = String(todayLocal.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(todayLocal.getUTCDate()).padStart(2, "0");
  // Offset: compute the actual UTC instant for `${yy}-${mm}-${dd} 00:00` and `23:59:59.999` in tz.
  const startLocalISO = `${yy}-${mm}-${dd}T00:00:00`;
  const endLocalISO = `${yy}-${mm}-${dd}T23:59:59.999`;
  // Use a helper: parse the local wall time as if UTC then adjust by tz offset
  function toUtc(localIso: string): string {
    const asUtc = new Date(localIso + "Z");
    // Determine tz offset for that instant
    const tzString = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, timeZoneName: "shortOffset",
    }).formatToParts(asUtc).find(p => p.type === "timeZoneName")?.value ?? "GMT-3";
    const match = tzString.match(/GMT([+-]\d+)(?::(\d+))?/);
    const offsetH = match ? Number(match[1]) : -3;
    const offsetM = match && match[2] ? Number(match[2]) : 0;
    const offsetMinutes = offsetH * 60 + (offsetH < 0 ? -offsetM : offsetM);
    // The local wall-clock time is `localIso`; corresponding UTC = local - offset
    const utc = new Date(asUtc.getTime() - offsetMinutes * 60 * 1000);
    return utc.toISOString();
  }
  return { from: toUtc(startLocalISO), to: toUtc(endLocalISO) };
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

    const range = body.from && body.to
      ? { from: body.from, to: body.to }
      : dMinusOneRange(config.timezone || "America/Sao_Paulo");

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
