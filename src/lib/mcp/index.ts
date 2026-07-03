import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyTicketsTool from "./tools/list-my-tickets";
import getTicketTool from "./tools/get-ticket";
import createTicketTool from "./tools/create-ticket";

// OAuth issuer MUST be the direct Supabase host (never the .lovable.cloud proxy).
// Vite inlines VITE_SUPABASE_PROJECT_ID at build time so this stays import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "grti-helpdesk-mcp",
  title: "GRTI Helpdesk",
  version: "0.1.0",
  instructions:
    "Tools for the GRTI Helpdesk. Use `list_my_tickets` to browse tickets visible to the signed-in user, `get_ticket` to read a single ticket with its comments, and `create_ticket` to open a new ticket. All access is scoped to the signed-in user via RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyTicketsTool, getTicketTool, createTicketTool],
});
