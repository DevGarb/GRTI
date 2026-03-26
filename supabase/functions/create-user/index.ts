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

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "super_admin"]);

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerIsSuperAdmin = callerRoles.some((r) => r.role === "super_admin");

    // Fetch caller's organization_id to assign to new user
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("user_id", caller.id)
      .single();

    const body = await req.json();
    const username = body.username; // e.g. "gabriel.porto"
    const password = body.password;
    const full_name = body.full_name;
    const userRole = body.role;
    const phone = body.phone || null;

    // Only super_admin can create admin users
    if (userRole === "admin" && !callerIsSuperAdmin) {
      return new Response(JSON.stringify({ error: "Apenas o super admin pode criar contas de administrador." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!username || !password || !full_name) {
      return new Response(JSON.stringify({ error: "username, password e full_name são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate username format (nome.sobrenome)
    const usernameClean = username.toLowerCase().trim();
    if (!/^[a-z]+\.[a-z]+$/.test(usernameClean)) {
      return new Response(JSON.stringify({ error: "Login deve seguir o formato nome.sobrenome (ex: gabriel.porto)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if username already exists
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", usernameClean)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "Este login já está em uso." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with fake email (username@grti.local)
    const fakeEmail = `${usernameClean}@grti.local`;

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name, username: usernameClean },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wait briefly for the trigger to create the profile
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Upsert profile with username and phone
    await adminClient
      .from("profiles")
      .upsert(
        { user_id: newUser.user!.id, username: usernameClean, phone, full_name, email: fakeEmail },
        { onConflict: "user_id" }
      );

    // Update role if not solicitante
    if (userRole && userRole !== "solicitante") {
      await adminClient.from("user_roles").delete().eq("user_id", newUser.user!.id);
      await adminClient.from("user_roles").insert({ user_id: newUser.user!.id, role: userRole });
    }

    return new Response(JSON.stringify({ user: newUser.user }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
