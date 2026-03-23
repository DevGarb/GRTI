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
    const { event_type, ticket_id, extra } = await req.json();

    if (!event_type || !ticket_id) {
      return new Response(
        JSON.stringify({ error: "event_type and ticket_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get ticket details
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("id, title, description, status, priority, type, sector, assigned_to, created_by, organization_id, created_at, updated_at, category_id")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) {
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profiles for technician and requester
    const userIds = [ticket.created_by, ticket.assigned_to].filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const requester = profileMap.get(ticket.created_by);
    const technician = ticket.assigned_to ? profileMap.get(ticket.assigned_to) : null;

    // Get rework count
    const { count: reworkCount } = await supabase
      .from("ticket_history")
      .select("*", { count: "exact", head: true })
      .eq("ticket_id", ticket_id)
      .eq("action", "rework");

    // Build payload
    const payload = {
      event_type,
      timestamp: new Date().toISOString(),
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        type: ticket.type,
        sector: ticket.sector,
        category_id: ticket.category_id,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        rework_count: reworkCount || 0,
      },
      requester: requester ? {
        name: requester.full_name,
        email: requester.email,
        phone: requester.phone,
      } : null,
      technician: technician ? {
        name: technician.full_name,
        email: technician.email,
        phone: technician.phone,
      } : null,
      ...(extra ? { extra } : {}),
    };

    // Get active webhooks for this org that subscribe to this event
    const { data: webhooks } = await supabase
      .from("organization_webhooks")
      .select("*")
      .eq("organization_id", ticket.organization_id)
      .eq("is_active", true);

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active webhooks configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const webhook of webhooks) {
      // Check if webhook subscribes to this event
      const events = webhook.events as string[];
      if (events && events.length > 0 && !events.includes(event_type)) {
        continue;
      }

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (webhook.secret) {
          headers["X-Webhook-Secret"] = webhook.secret;
        }

        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const statusCode = response.status;
        let responseBody: any = {};
        try {
          responseBody = await response.json();
        } catch {
          responseBody = { text: await response.text().catch(() => "") };
        }

        // Log the webhook call
        await supabase.from("webhook_logs").insert({
          event_type: `webhook_${event_type}`,
          ticket_id: ticket.id,
          ticket_title: ticket.title,
          technician_name: technician?.full_name || null,
          status_code: statusCode,
          response: responseBody,
        });

        results.push({ webhook_id: webhook.id, status: statusCode, success: statusCode >= 200 && statusCode < 300 });
      } catch (err) {
        await supabase.from("webhook_logs").insert({
          event_type: `webhook_${event_type}`,
          ticket_id: ticket.id,
          ticket_title: ticket.title,
          technician_name: technician?.full_name || null,
          status_code: 0,
          response: { error: err.message },
        });
        results.push({ webhook_id: webhook.id, status: 0, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error dispatching webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
