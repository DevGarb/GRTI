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

const PERIODS: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  dia: "Dia inteiro",
};

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

    if (record.status && record.status !== "pendente") {
      return new Response(JSON.stringify({ skipped: true, reason: "Agendamento não está pendente" }), {
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

    const plate = record.vehicle_plate ?? "";
    const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
  <div style="background:#0d4a56;color:#fff;padding:16px 20px">
    <h1 style="margin:0;font-size:18px">Novo agendamento aguardando confirmação</h1>
  </div>
  <div style="padding:20px;color:#111827">
    <p style="margin:0 0 16px">Uma nova solicitação de agendamento chegou na Oficina e precisa ser confirmada.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b7280">Placa</td><td style="padding:6px 0;font-weight:bold">${esc(plate)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Modelo</td><td style="padding:6px 0">${esc(record.vehicle_model)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Tipo de serviço</td><td style="padding:6px 0">${esc(record.service_type)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Data preferida</td><td style="padding:6px 0">${esc(fmtDate(record.preferred_date))} · ${esc(PERIODS[record.preferred_period] ?? "—")}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Solicitante</td><td style="padding:6px 0">${esc(record.requester_name)}</td></tr>
    </table>
    ${record.description ? `<p style="margin:16px 0 0;font-size:14px;color:#374151"><strong>Descrição:</strong><br/>${esc(record.description)}</p>` : ""}
    <p style="margin:24px 0 0">
      <a href="https://grti.lovable.app/op/oficina/agenda" style="background:#e8531f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block;font-size:14px">Abrir Agenda da Oficina</a>
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
        subject: `[Oficina] Novo agendamento para confirmar - ${plate}`.trim(),
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
    console.error("notify-oficina-agendamento error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
