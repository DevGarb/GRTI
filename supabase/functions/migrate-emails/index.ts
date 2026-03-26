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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Update ti.coordenador user email
    const { error: e1 } = await adminClient.auth.admin.updateUserById(
      "8c2a1788-ec3b-4575-a90c-2d804fa0577e",
      { email: "ti.coordenador@grti.local", email_confirm: true }
    );

    // Update danilo.souza user email  
    const { error: e2 } = await adminClient.auth.admin.updateUserById(
      "a615ad15-d455-4a66-b313-fba8dc28043e",
      { email: "danilo.souza@grti.local", email_confirm: true }
    );

    return new Response(JSON.stringify({ 
      ti_coordenador: e1 ? e1.message : "ok",
      danilo_souza: e2 ? e2.message : "ok"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
