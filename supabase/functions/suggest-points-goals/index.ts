// Sugere a meta de PONTUAÇÃO do mês vigente para cada técnico,
// com base na evolução dos últimos 6 meses.

import { streamLovableResponse } from "../_shared/openaiResponses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TechHistory {
  user_id: string;
  name: string;
  history: { label: string; points: number }[];
  average: number;
  current_goal: number | null;
}

interface Body {
  organization_name?: string | null;
  period_label: string;
  technicians: TechHistory[];
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          user_id: { type: "string" },
          suggested_points: { type: "number" },
          trend: { type: "string", enum: ["crescente", "estavel", "queda"] },
          rationale: { type: "string" },
        },
        required: ["user_id", "suggested_points", "trend", "rationale"],
      },
    },
  },
  required: ["suggestions"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ suggestions: [], error: "AI key não configurada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const techs = body.technicians ?? [];
    if (techs.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const block = techs
      .map((t) => {
        const hist = t.history.map((h) => `${h.label}=${h.points}`).join(", ");
        return `- user_id: ${t.user_id} | ${t.name} | histórico (mais antigo → mais recente): ${hist || "sem dados"} | média: ${t.average.toFixed(1)} | meta atual do mês: ${t.current_goal ?? "não definida"}`;
      })
      .join("\n");

    const prompt = `Você é analista de performance de uma equipe de TI${body.organization_name ? ` da ${body.organization_name}` : ""}. Defina a META DE PONTUAÇÃO de ${body.period_label} para cada técnico abaixo, com base na evolução real dos últimos 6 meses.

DADOS:
${block}

REGRAS DE CÁLCULO:
- Ancore a sugestão na média dos meses com dados, ajustando pela tendência (evolução constante).
- Tendência crescente: média ajustada para cima, no máximo +15% acima do melhor mês recente.
- Tendência estável: use a média (ou levemente acima, até +5%).
- Tendência de queda: use a média dos meses recentes, sem punir com meta inatingível nem premiar a queda.
- Nunca sugira meta menor que 50% da média nem maior que 150% da média.
- Se o técnico só tem 1 mês ou nenhum dado, use esse valor (ou 0 quando não houver base) e diga isso na justificativa.
- Arredonde para número inteiro de pontos.
- rationale: 1 frase em português, com números, explicando a base do cálculo. Sem elogios vazios.

Responda um item por técnico, usando exatamente o user_id informado.`;

    const aiRes = await streamLovableResponse({
      apiKey,
      model: "openai/gpt-5.6-sol",
      input: [
        {
          role: "system",
          content:
            "Você define metas de pontuação realistas a partir de séries históricas. Responda em português, objetivo, sempre com números. Nunca invente dados que não foram informados.",
        },
        { role: "user", content: prompt },
      ],
      textFormat: { type: "json_schema", name: "points_goal_suggestions", schema, strict: true },
    });

    if (!aiRes.ok) {
      console.warn("Lovable AI gateway non-ok", aiRes.status, aiRes.body);
      const msg =
        aiRes.status === 429
          ? "Limite de requisições de IA atingido. Tente novamente em instantes."
          : aiRes.status === 402
            ? "Créditos de IA insuficientes no workspace."
            : aiRes.status === 403
              ? "IA bloqueada por política do workspace."
              : `Falha na IA (${aiRes.status}).`;
      return new Response(JSON.stringify({ suggestions: [], error: msg }), {
        status: aiRes.status === 429 ? 429 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = aiRes.text ? JSON.parse(aiRes.text) : {};
    const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("suggest-points-goals error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
