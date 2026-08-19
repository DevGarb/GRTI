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

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let companyName = "—";
    if (record.company_id) {
      const { data: company } = await supabase
        .from("op_companies")
        .select("name")
        .eq("id", record.company_id)
        .maybeSingle();
      if (company?.name) companyName = company.name;
    }

    let mechanicName = "—";
    if (record.mechanic_id) {
      const { data: mech } = await supabase
        .from("op_mechanics")
        .select("name")
        .eq("id", record.mechanic_id)
        .maybeSingle();
      if (mech?.name) mechanicName = mech.name;
    }

    const alertAt = record.supervisor_alert_at || new Date().toISOString();
    const alertFmt = new Date(alertAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const osNumber = record.os_number ? `OS #${record.os_number}` : "OS";

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
  <div style="background:#0d4a56;color:#fff;padding:16px 20px">
    <h1 style="margin:0;font-size:18px">Supervisor acionado na Oficina</h1>
  </div>
  <div style="padding:20px;color:#111827">
    <p style="margin:0 0 16px">Um mecânico registrou uma <strong>intercorrência</strong> e acionou o supervisor.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b7280">Número</td><td style="padding:6px 0;font-weight:bold">${esc(osNumber)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Motivo</td><td style="padding:6px 0;font-weight:bold">${esc(record.supervisor_alert_reason)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Placa</td><td style="padding:6px 0">${esc(record.vehicle_plate)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Modelo</td><td style="padding:6px 0">${esc(record.vehicle_model)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Empresa</td><td style="padding:6px 0">${esc(companyName)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Cliente</td><td style="padding:6px 0">${esc(record.customer_name)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Mecânico</td><td style="padding:6px 0">${esc(mechanicName)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Acionado em</td><td style="padding:6px 0">${esc(alertFmt)}</td></tr>
    </table>
    ${record.supervisor_alert_note ? `<p style="margin:16px 0 0;font-size:14px;color:#374151"><strong>Observação:</strong><br/>${esc(record.supervisor_alert_note)}</p>` : ""}
    <p style="margin:24px 0 0">
      <a href="https://grti.lovable.app/op/oficina/alertas" style="background:#e8531f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block;font-size:14px">Ver alertas</a>
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
        subject: `[Oficina] Supervisor acionado - ${osNumber} ${record.vehicle_plate ?? ""}`.trim(),
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
    console.error("notify-supervisor-alert error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
