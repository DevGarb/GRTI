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

    const { organization_id: _omit, ...safe } = data;
    return json({ ...safe, organization });
  } catch (e) {
    console.error("get-public-asset crash", e);
    return json({ error: "server_error" }, 500);
  }
});
