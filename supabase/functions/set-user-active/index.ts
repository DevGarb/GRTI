import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: globalRoles }, { data: orgRoles }] = await Promise.all([
      adminClient.from("user_roles").select("role").eq("user_id", caller.id),
      adminClient.from("user_organization_roles").select("role").eq("user_id", caller.id),
    ]);
    const allRoles = [
      ...(globalRoles || []).map((r: any) => r.role),
      ...(orgRoles || []).map((r: any) => r.role),
    ];
    if (!allRoles.some((r) => r === "admin" || r === "super_admin")) {
      return json({ error: "Forbidden: admin role required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body.user_id;
    const active: boolean | undefined = body.active;

    if (!userId || typeof active !== "boolean") {
      return json({ error: "user_id e active (boolean) são obrigatórios" }, 400);
    }
    if (userId === caller.id) {
      return json({ error: "Você não pode inativar o próprio acesso" }, 400);
    }

    // Protect super admins
    const { data: targetSuper } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .limit(1);
    if (targetSuper && targetSuper.length > 0) {
      return json({ error: "Não é possível inativar um super admin" }, 400);
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        is_active: active,
        deactivated_at: active ? null : new Date().toISOString(),
        deactivated_by: active ? null : caller.id,
      })
      .eq("user_id", userId);
    if (profileError) return json({ error: profileError.message }, 400);

    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: active ? "none" : "876000h",
    } as any);
    if (authError) return json({ error: authError.message }, 400);

    return json({ ok: true, active });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return json({ error: message }, 500);
  }
});
