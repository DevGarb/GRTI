import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticket_id, event_type } = await req.json();

    if (!ticket_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "ticket_id and event_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get ticket details
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("id, title, status, assigned_to, organization_id, priority")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get org integration config
    const { data: integration } = await supabase
      .from("organization_integrations")
      .select("*")
      .eq("organization_id", ticket.organization_id)
      .eq("integration_type", "uazapi")
      .eq("is_active", true)
      .single();

    if (!integration) {
      return new Response(
        JSON.stringify({ error: "UAZAPI integration not configured or inactive" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if notification type is enabled
    if (event_type === "assigned" && !integration.notify_on_assign) {
      return new Response(
        JSON.stringify({ message: "Assign notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if ((event_type === "resolved" || event_type === "rework") && !integration.notify_on_resolve) {
      return new Response(
        JSON.stringify({ message: "Resolve notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get technician info
    let techPhone = "";
    let techName = "";
    if (ticket.assigned_to) {
      const { data: techProfile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", ticket.assigned_to)
        .single();

      if (techProfile) {
        techName = techProfile.full_name || "";
        techPhone = techProfile.phone || "";
      }
    }

    if (!techPhone) {
      console.log("No phone number for technician, skipping WhatsApp");
      return new Response(
        JSON.stringify({ message: "Technician has no phone number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build message
    let message = "";
    if (event_type === "assigned") {
      message = `🔧 *Novo chamado atribuído*\n\n📋 *Título:* ${ticket.title}\n🔴 *Prioridade:* ${ticket.priority}\n👤 *Técnico:* ${techName}\n\nAcesse o sistema para mais detalhes.`;
    } else if (event_type === "resolved") {
      message = `✅ *Chamado resolvido*\n\n📋 *Título:* ${ticket.title}\n👤 *Técnico:* ${techName}\n\nO chamado foi marcado como resolvido.`;
    } else if (event_type === "rework") {
      message = `🔄 *Chamado retrabalhado*\n\n📋 *Título:* ${ticket.title}\n🔴 *Prioridade:* ${ticket.priority}\n👤 *Técnico:* ${techName}\n\nO solicitante reprovou a solução e o chamado voltou para retrabalho. Acesse o sistema para verificar.`;
    }

    // Clean phone number
    const cleanPhone = techPhone.replace(/\D/g, "");

    // Send via UAZAPI
    const uazapiUrl = `${integration.api_url}/sendText/${integration.instance_id}`;
    const uazapiResponse = await fetch(uazapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${integration.api_token}`,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    });

    const responseData = await uazapiResponse.json();
    const statusCode = uazapiResponse.status;

    // Log webhook
    await supabase.from("webhook_logs").insert({
      event_type: `whatsapp_${event_type}`,
      ticket_id: ticket.id,
      ticket_title: ticket.title,
      technician_name: techName,
      status_code: statusCode,
      response: responseData,
    });

    return new Response(
      JSON.stringify({ success: uazapiResponse.ok, status: statusCode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
