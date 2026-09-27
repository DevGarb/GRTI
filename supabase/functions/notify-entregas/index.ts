import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TO_EMAIL = "notificacaoapoiocearagps@gmail.com";
const FROM_EMAIL = "GRTI Entregas <onboarding@resend.dev>";

function esc(v: unknown) {
  return String(v ?? "—").replace(/[<>&]/g, (c) => ({ "<": "<", ">": ">", "&": "&" }[c] as string));
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = String(iso).slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : String(iso);
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

    if (record.status && record.status !== "Pendente") {
      return new Response(JSON.stringify({ skipped: true, reason: "Pedido não está Pendente" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (record.driver_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "Pedido já possui motorista" }), {
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

    let categoryName = "—";
    if (record.category_id) {
      const { data: category } = await supabase
        .from("op_delivery_categories")
        .select("name")
        .eq("id", record.category_id)
        .maybeSingle();
      if (category?.name) categoryName = category.name;
    }

    const createdAt = record.created_at || new Date().toISOString();
    const createdFmt = new Date(createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
  <div style="background:#0d4a56;color:#fff;padding:16px 20px">
    <h1 style="margin:0;font-size:18px">Novo pedido pendente nas Entregas</h1>
  </div>
  <div style="padding:20px;color:#111827">
    <p style="margin:0 0 16px">Um novo pedido foi criado e está aguardando atribuição de motorista.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b7280">Tipo</td><td style="padding:6px 0;font-weight:bold">${esc(record.type)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Categoria</td><td style="padding:6px 0">${esc(categoryName)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Empresa</td><td style="padding:6px 0">${esc(companyName)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Data agendada</td><td style="padding:6px 0">${esc(fmtDate(record.scheduled_date))} · ${esc(record.period)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Endereço</td><td style="padding:6px 0">${esc(record.address)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Contato</td><td style="padding:6px 0">${esc(record.contact_name)} ${record.contact_phone ? "· " + esc(record.contact_phone) : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Solicitante</td><td style="padding:6px 0">${esc(record.requester_name)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Criado em</td><td style="padding:6px 0">${esc(createdFmt)}</td></tr>
    </table>
    ${record.notes ? `<p style="margin:16px 0 0;font-size:14px;color:#374151"><strong>Observações:</strong><br/>${esc(record.notes)}</p>` : ""}
    <p style="margin:24px 0 0">
      <a href="https://grti.lovable.app/op/entregas" style="background:#e8531f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block;font-size:14px">Abrir Entregas</a>
    </p>
  </div>
</div>`;

    const subject = `[Entregas] Novo pedido pendente - ${companyName !== "—" ? companyName + " - " : ""}${record.type ?? ""}`.trim();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject,
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
    console.error("notify-entregas error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
