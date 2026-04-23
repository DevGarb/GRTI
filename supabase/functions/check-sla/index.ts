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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find tickets where SLA has expired
    const { data: expiredTickets, error: fetchError } = await supabase
      .from("tickets")
      .select("id, assigned_to, title")
      .eq("status", "Aberto")
      .not("assigned_to", "is", null)
      .lt("sla_deadline", new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredTickets || expiredTickets.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired SLA tickets found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updatedCount = 0;

    for (const ticket of expiredTickets) {
      // Save original technician and make ticket available
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          original_assigned_to: ticket.assigned_to,
          assigned_to: null,
          status: "Disponível",
        })
        .eq("id", ticket.id);

      if (updateError) {
        console.error(`Error updating ticket ${ticket.id}:`, updateError);
        continue;
      }

      // Insert history record
      await supabase.from("ticket_history").insert({
        ticket_id: ticket.id,
        user_id: ticket.assigned_to,
        action: "sla_expired",
        old_value: "Aberto",
        new_value: "Disponível",
      });

      // Insert audit log
      await supabase.from("audit_logs").insert({
        user_id: ticket.assigned_to,
        action: "sla_expired",
        entity_type: "ticket",
        entity_id: ticket.id,
        details: {
          title: ticket.title,
          original_assigned_to: ticket.assigned_to,
        },
      });

      updatedCount++;
    }

    return new Response(
      JSON.stringify({
        message: `SLA check complete. ${updatedCount} tickets expired.`,
        count: updatedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-sla error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
