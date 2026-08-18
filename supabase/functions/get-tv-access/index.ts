import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: profile }, { data: globalRoles }, { data: orgRoles }] = await Promise.all([
      adminClient.from("profiles").select("organization_id").eq("id", caller.id).maybeSingle(),
      adminClient.from("user_roles").select("role").eq("user_id", caller.id),
      adminClient.from("user_organization_roles").select("role").eq("user_id", caller.id),
    ]);

    let slug: string | null = null;
    if (profile?.organization_id) {
      const { data: org } = await adminClient
        .from("organizations")
        .select("slug")
        .eq("id", profile.organization_id)
        .maybeSingle();
      slug = org?.slug ?? null;
    }

    const allRoles = [
      ...(globalRoles || []).map((r: any) => r.role),
      ...(orgRoles || []).map((r: any) => r.role),
    ];
    const isAdmin = allRoles.some((r) => r === "admin" || r === "super_admin");

    return new Response(
      JSON.stringify({ slug, token: isAdmin ? (Deno.env.get("TV_DASHBOARD_TOKEN") ?? null) : null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
