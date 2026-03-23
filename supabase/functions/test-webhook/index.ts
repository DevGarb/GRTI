import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { webhook_id } = await req.json();
    if (!webhook_id) {
      return new Response(JSON.stringify({ error: "webhook_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read webhook
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: webhook, error: whErr } = await serviceClient
      .from("organization_webhooks")
      .select("*")
      .eq("id", webhook_id)
      .single();

    if (whErr || !webhook) {
      return new Response(JSON.stringify({ error: "Webhook not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build test payload
    const testPayload = {
      event_type: "test",
      timestamp: new Date().toISOString(),
      test: true,
      ticket: {
        id: "00000000-0000-0000-0000-000000000000",
        title: "Chamado de teste",
        description: "Este é um payload de teste enviado manualmente.",
        status: "Aberto",
        priority: "Urgente",
        type: "Hardware",
        sector: "TI",
        category_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        rework_count: 0,
      },
      requester: {
        name: "Solicitante Teste",
        email: "solicitante@teste.com",
        phone: "11999999999",
      },
      technician: {
        name: "Técnico Teste",
        email: "tecnico@teste.com",
        phone: "11988888888",
      },
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (webhook.secret) {
      headers["X-Webhook-Secret"] = webhook.secret;
    }

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(testPayload),
    });

    const statusCode = response.status;
    let responseBody: any = {};
    try {
      responseBody = await response.json();
    } catch {
      responseBody = { text: await response.text().catch(() => "") };
    }

    // Log it
    await serviceClient.from("webhook_logs").insert({
      event_type: "webhook_test",
      ticket_id: null,
      ticket_title: "Teste manual",
      technician_name: null,
      status_code: statusCode,
      response: responseBody,
    });

    const success = statusCode >= 200 && statusCode < 300;

    return new Response(
      JSON.stringify({ success, status_code: statusCode, response: responseBody }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Test webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
