import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    if (!id && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      id = body?.id ?? null;
    }
    if (!id || !UUID_RE.test(id)) {
      return json({ error: "invalid_id" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("patrimonio")
      .select(
        "id, asset_tag, equipment_type, brand, model, serial_number, sector, responsible, location, status, notes, photo_url, created_at, organization_id",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("patrimonio query error", error);
      return json({ error: "server_error" }, 500);
    }
    if (!data) return json({ error: "not_found" }, 404);

    // Branding da organização
    let organization: {
      name: string;
      logo_url: string | null;
      primary_color: string | null;
    } | null = null;

    if (data.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name, logo_url, primary_color")
        .eq("id", data.organization_id)
        .maybeSingle();
      if (org) organization = org;
    }

    // Última manutenção preventiva (asset_tag + organization_id)
    let last_maintenance: {
      execution_date: string;
      responsible: string | null;
      notes: string | null;
      checklist: Record<string, unknown> | null;
    } | null = null;
    {
      let q = supabase
        .from("preventive_maintenance")
        .select("execution_date, responsible, notes, checklist")
        .eq("asset_tag", data.asset_tag)
        .order("execution_date", { ascending: false })
        .limit(1);
      if (data.organization_id) q = q.eq("organization_id", data.organization_id);
      const { data: maint } = await q.maybeSingle();
      if (maint) last_maintenance = maint;
    }

    // Intervalo de manutenção por tipo de equipamento.
    // Regra: se o tipo não tem intervalo cadastrado, assume-se 90 dias por padrão.
    const DEFAULT_INTERVAL_DAYS = 90;
    let maintenance_interval_days: number = DEFAULT_INTERVAL_DAYS;
    let maintenance_interval_source: "configured" | "default" = "default";
    {
      const { data: itv } = await supabase
        .from("maintenance_intervals")
        .select("interval_days")
        .eq("equipment_type", data.equipment_type)
        .maybeSingle();
      if (itv?.interval_days) {
        maintenance_interval_days = itv.interval_days;
        maintenance_interval_source = "configured";
      }
    }

    // Linha do tempo completa (até 50 entradas, desc) + responsáveis derivados (asc)
    let relocation_history: Array<{
      changed_at: string;
      field: string;
      old_value: string | null;
      new_value: string | null;
      changed_by_name: string | null;
      reason: string | null;
    }> = [];
    let responsible_history: Array<{
      from: string | null;
      to: string | null;
      started_at: string;
      ended_at: string | null;
      changed_by_name: string | null;
    }> = [];
    {
      const { data: hist } = await supabase
        .from("patrimonio_history")
        .select("changed_at, field, old_value, new_value, changed_by, reason")
        .eq("patrimonio_id", data.id)
        .order("changed_at", { ascending: false })
        .limit(100);

      const rows = hist ?? [];
      // Resolver nomes
      const ids = Array.from(
        new Set(rows.map((r) => r.changed_by).filter((v): v is string => !!v)),
      );
      const nameMap = new Map<string, string>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        for (const p of profs ?? []) {
          if (p.user_id && p.full_name) nameMap.set(p.user_id, p.full_name);
        }
      }

      relocation_history = rows.map((r) => ({
        changed_at: r.changed_at,
        field: r.field,
        old_value: r.old_value,
        new_value: r.new_value,
        changed_by_name: r.changed_by ? nameMap.get(r.changed_by) ?? null : null,
        reason: (r as { reason?: string | null }).reason ?? null,
      }));

      // Responsáveis em ordem ascendente
      const respAsc = rows
        .filter((r) => r.field === "responsible")
        .slice()
        .sort(
          (a, b) =>
            new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime(),
        );

      responsible_history = respAsc.map((r, idx) => ({
        from: r.old_value,
        to: r.new_value,
        started_at: r.changed_at,
        ended_at: idx < respAsc.length - 1 ? respAsc[idx + 1].changed_at : null,
        changed_by_name: r.changed_by ? nameMap.get(r.changed_by) ?? null : null,
      }));
    }

    const { organization_id: _omit, ...safe } = data;
    return json({
      ...safe,
      organization,
      last_maintenance,
      maintenance_interval_days,
      maintenance_interval_source,
      relocation_history,
      responsible_history,
    });
  } catch (e) {
    console.error("get-public-asset crash", e);
    return json({ error: "server_error" }, 500);
  }
});
