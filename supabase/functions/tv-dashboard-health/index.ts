import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type CheckState = "ok" | "fail" | "skipped";
interface Check {
  name: string;
  state: CheckState;
  detail?: string;
  ms?: number;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const checks: Check[] = [];
  const push = (c: Check) => { checks.push(c); return c; };

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("org");
    const token = url.searchParams.get("token");

    // 1. Parâmetros obrigatórios
    if (!slug || !token) {
      push({ name: "params", state: "fail", detail: "Informe ?org=<slug>&token=<token>" });
      return json({ status: "invalid_request", category: "request", checks, total_ms: Date.now() - startedAt }, 400);
    }
    push({ name: "params", state: "ok" });

    // 2. Configuração do ambiente (segredos) — falha aqui é de infraestrutura, não de permissão
    const expected = Deno.env.get("TV_DASHBOARD_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const missing = [
      !expected && "TV_DASHBOARD_TOKEN",
      !supabaseUrl && "SUPABASE_URL",
      !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean) as string[];
    if (missing.length) {
      push({ name: "config", state: "fail", detail: `Segredos ausentes: ${missing.join(", ")}` });
      return json({ status: "unhealthy", category: "config", checks, total_ms: Date.now() - startedAt }, 500);
    }
    push({ name: "config", state: "ok" });

    // 3. Autenticação do painel
    if (token !== expected) {
      push({ name: "auth", state: "fail", detail: "Token do painel inválido" });
      push({ name: "tenant", state: "skipped" });
      push({ name: "db_read", state: "skipped" });
      return json({ status: "unhealthy", category: "auth", checks, total_ms: Date.now() - startedAt }, 401);
    }
    push({ name: "auth", state: "ok" });

    const supabase = createClient(supabaseUrl!, serviceKey!);

    // 4. Acesso ao tenant (organização existe e é resolvível pelo slug)
    const tenantStart = Date.now();
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();
    const tenantMs = Date.now() - tenantStart;

    if (orgError) {
      push({ name: "tenant", state: "fail", detail: orgError.message, ms: tenantMs });
      push({ name: "db_read", state: "skipped" });
      return json({ status: "unhealthy", category: "database", checks, total_ms: Date.now() - startedAt }, 503);
    }
    if (!org) {
      push({ name: "tenant", state: "fail", detail: `Organização "${slug}" não encontrada`, ms: tenantMs });
      push({ name: "db_read", state: "skipped" });
      return json({ status: "unhealthy", category: "tenant", checks, total_ms: Date.now() - startedAt }, 404);
    }
    push({ name: "tenant", state: "ok", ms: tenantMs });

    // 5. Leitura real de dados do tenant (mesma tabela que o painel consulta)
    const dbStart = Date.now();
    const { count, error: dbError } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id);
    const dbMs = Date.now() - dbStart;

    if (dbError) {
      push({ name: "db_read", state: "fail", detail: dbError.message, ms: dbMs });
      return json({ status: "unhealthy", category: "database", checks, total_ms: Date.now() - startedAt }, 503);
    }
    push({ name: "db_read", state: "ok", ms: dbMs });

    return json({
      status: "healthy",
      category: null,
      organization: { id: org.id, name: org.name, slug: org.slug },
      tickets_count: count ?? 0,
      checks,
      total_ms: Date.now() - startedAt,
    }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    push({ name: "unexpected", state: "fail", detail: message });
    return json({ status: "unhealthy", category: "internal", checks, total_ms: Date.now() - startedAt }, 500);
  }
});
