import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiToken = req.headers.get("x-api-token");
    if (!apiToken) {
      return new Response(JSON.stringify({ error: "Missing X-API-Token header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("api_tokens")
      .select("*")
      .eq("token", apiToken)
      .eq("is_active", true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Invalid or inactive token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last_used_at
    await supabaseAdmin
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    const url = new URL(req.url);
    const resource = url.searchParams.get("resource");
    const orgId = tokenData.organization_id;
    const id = url.searchParams.get("id");

    if (!orgId) {
      return new Response(JSON.stringify({ error: "Token must be linked to an organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const allowedResources = [
      "tickets", "profiles", "categories", "patrimonio",
      "preventive_maintenance", "sectors", "projects",
      "evaluations", "ticket_comments", "ticket_history",
      "organizations",
    ];

    if (!resource || !allowedResources.includes(resource)) {
      return new Response(
        JSON.stringify({
          error: "Invalid or missing resource parameter",
          allowed: allowedResources,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle GET (list/detail)
    if (req.method === "GET") {
      let query = supabaseAdmin.from(resource).select("*");

      // Always filter by org - token is org-scoped
      if (resource !== "organizations") {
        query = query.eq("organization_id", orgId);
      } else {
        query = query.eq("id", orgId);
      }

      if (id) {
        query = query.eq("id", id).single();
      } else {
        query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ data, meta: id ? undefined : { limit, offset } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle POST (create)
    if (req.method === "POST") {
      const body = await req.json();
      if (resource !== "organizations") {
        body.organization_id = orgId;
      }

      const { data, error } = await supabaseAdmin.from(resource).insert(body).select().single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ data }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle PATCH (update)
    if (req.method === "PATCH") {
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { data, error } = await supabaseAdmin.from(resource).update(body).eq("id", id).select().single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
