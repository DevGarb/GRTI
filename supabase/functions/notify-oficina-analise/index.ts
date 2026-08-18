import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TO_EMAIL = "joelmirfranklin92@gmail.com";
const FROM_EMAIL = "GRTI Oficina <onboarding@resend.dev>";

function esc(v: unknown) {
  return String(v ?? "—").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    const record = body?.record ?? body;

    if (!record || typeof record !== "object" || !record.id) {
      return new Response(JSON.stringify({ error: "Payload inválido: 'record' é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (record.stage && record.stage !== "analise") {
      return new Response(JSON.stringify({ skipped: true, reason: "OS não está em Análise/Triagem" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Nome da empresa/oficina
    let companyName = "—";
    if (record.company_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: company } = await supabase
        .from("op_companies")
        .select("name")
        .eq("id", record.company_id)
        .maybeSingle();
      if (company?.name) companyName = company.name;
    }

    const openedAt = record.opened_at || record.created_at || new Date().toISOString();
    const openedFmt = new Date(
      String(openedAt).length === 10 ? `${openedAt}T12:00:00-03:00` : openedAt,
    ).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const osNumber = record.os_number ? `OS #${record.os_number}` : "Nova OS";

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
  <div style="background:#0d4a56;color:#fff;padding:16px 20px">
    <h1 style="margin:0;font-size:18px">Nova OS em Análise / Triagem</h1>
  </div>
  <div style="padding:20px;color:#111827">
    <p style="margin:0 0 16px">Um novo cartão entrou na coluna <strong>Análise / Triagem</strong> da Oficina.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b7280">Número</td><td style="padding:6px 0;font-weight:bold">${esc(osNumber)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Placa</td><td style="padding:6px 0">${esc(record.vehicle_plate)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Modelo</td><td style="padding:6px 0">${esc(record.vehicle_model)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Empresa</td><td style="padding:6px 0">${esc(companyName)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Cliente</td><td style="padding:6px 0">${esc(record.customer_name)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Aberta em</td><td style="padding:6px 0">${esc(openedFmt)}</td></tr>
    </table>
    ${record.description ? `<p style="margin:16px 0 0;font-size:14px;color:#374151"><strong>Problema:</strong><br/>${esc(record.description)}</p>` : ""}
    <p style="margin:24px 0 0">
      <a href="https://grti.lovable.app/op/oficina" style="background:#e8531f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block;font-size:14px">Abrir Oficina</a>
    </p>
  </div>
</div>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject: `[Oficina] ${osNumber} em Análise/Triagem - ${record.vehicle_plate ?? ""}`.trim(),
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend falhou [${response.status}]: ${errorBody}`);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar email", status: response.status, details: errorBody }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    console.log("Email enviado:", data?.id);
    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-oficina-analise error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
