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
  name: "create_ticket",
  title: "Create ticket",
  description:
    "Create a new helpdesk ticket on behalf of the signed-in user. The user's organization is auto-assigned by the database.",
  inputSchema: {
    title: z.string().trim().min(3).describe("Short ticket title."),
    description: z.string().trim().optional().describe("Full description of the issue."),
    priority: z
      .enum(["Baixa", "Média", "Alta", "Urgente"])
      .default("Média")
      .describe("Ticket priority."),
    type: z.string().trim().optional().describe("Ticket type/category label, e.g. 'Hardware'."),
    sector: z.string().trim().optional().describe("Sector/department the ticket belongs to."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description, priority, type, sector }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId()!;

    // Business rule: block creation if the user already has tickets awaiting approval
    const { data: pending, error: pendingErr } = await sb
      .from("tickets")
      .select("id, title, aguardando_aprovacao_at")
      .eq("created_by", userId)
      .eq("status", "Aguardando Aprovação");
    if (pendingErr) {
      return { content: [{ type: "text", text: pendingErr.message }], isError: true };
    }
    if (pending && pending.length > 0) {
      const list = pending.map((p: any) => `- ${p.id} — ${p.title}`).join("\n");
      return {
        content: [
          {
            type: "text",
            text:
              `Cannot open a new ticket: you have ${pending.length} ticket(s) awaiting approval. ` +
              `Approve or send them back for rework before opening another.\n\n${list}`,
          },
        ],
        structuredContent: { error: "pending_approval_tickets", pending },
        isError: true,
      };
    }

    const { data, error } = await sb
      .from("tickets")
      .insert({
        title,
        description: description ?? null,
        priority,
        type: type ?? "Outros",
        sector: sector ?? null,
        status: "Aberto",
        created_by: userId,
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { ticket: data },
    };
  },
});
