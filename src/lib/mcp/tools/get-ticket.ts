import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_ticket",
  title: "Get ticket",
  description:
    "Fetch a single helpdesk ticket by ID, including its public comments. RLS applies.",
  inputSchema: {
    ticket_id: z.string().uuid().describe("Ticket UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ticket_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const [{ data: ticket, error: tErr }, { data: comments, error: cErr }] = await Promise.all([
      sb.from("tickets").select("*").eq("id", ticket_id).maybeSingle(),
      sb
        .from("ticket_comments")
        .select("id,message,created_at,author_id,is_internal")
        .eq("ticket_id", ticket_id)
        .order("created_at", { ascending: true }),
    ]);
    if (tErr) return { content: [{ type: "text", text: tErr.message }], isError: true };
    if (!ticket) return { content: [{ type: "text", text: "Ticket not found" }], isError: true };
    const payload = { ticket, comments: cErr ? [] : comments ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
