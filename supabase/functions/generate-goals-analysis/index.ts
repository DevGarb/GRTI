// Gera insights de IA sobre o atingimento das METAS do mês.
// Recebe o payload já calculado pelo frontend (mesma fonte da tela de Metas).

import { streamLovableResponse } from "../_shared/openaiResponses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GoalItem {
  metric: string;
  label: string;
  target: number;
  actual: number;
  pct: number;
  inverse: boolean;
}

interface TechGoals {
  name: string;
  closed: number;
  csat: number;
  csat_count: number;
  points: number;
  rework_percent: number;
  attainment: number;
  goals: GoalItem[];
}

interface Body {
  organization_name?: string | null;
  period_label: string;
  month_progress?: { days_elapsed: number; days_total: number; business_days_left: number };
  kpis: {
    avg_attainment: number;
    total_closed: number;
    avg_csat: number;
    csat_count: number;
    techs_with_goals: number;
    goals_met: number;
    goals_total: number;
  };
  podium: { position: number; name: string; points: number; closed: number }[];
  technicians: TechGoals[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ insights: [], error: "AI key não configurada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mp = body.month_progress;
    const techBlock = (body.technicians ?? [])
      .map((t) => {
        const goalsStr = (t.goals ?? [])
          .map((g) => `${g.label}: ${g.actual}${g.inverse ? " (máx " : " / meta "}${g.target}${g.inverse ? ")" : ""} = ${g.pct}%`)
          .join(" | ");
        return `- ${t.name}: atingimento médio ${t.attainment}% | ${t.closed} chamados fechados | CSAT ${t.csat > 0 ? t.csat.toFixed(2) : "sem avaliações"} (${t.csat_count}) | ${t.points.toFixed(0)} pts | retrabalho ${t.rework_percent.toFixed(0)}%\n    Metas → ${goalsStr || "sem metas"}`;
      })
      .join("\n");

    const podiumStr = (body.podium ?? [])
      .map((p) => `${p.position}º ${p.name} — ${p.points.toFixed(0)} pts (${p.closed} chamados)`)
      .join("; ") || "sem dados";

    const prompt = `Você é analista executivo de performance de uma equipe de TI (helpdesk)${body.organization_name ? ` da ${body.organization_name}` : ""}. Analise o ATINGIMENTO DAS METAS do período ${body.period_label}.

${mp ? `Progresso do mês: dia ${mp.days_elapsed} de ${mp.days_total}, restam ${mp.business_days_left} dias úteis. Use isso para julgar se o ritmo atual leva ao atingimento.` : ""}

INDICADORES GERAIS:
- Atingimento médio da equipe: ${body.kpis.avg_attainment}%
- Metas batidas: ${body.kpis.goals_met} de ${body.kpis.goals_total}
- Chamados resolvidos no período: ${body.kpis.total_closed}
- CSAT médio: ${body.kpis.avg_csat > 0 ? body.kpis.avg_csat.toFixed(2) : "sem avaliações"} (${body.kpis.csat_count} avaliações)
- Técnicos com meta definida: ${body.kpis.techs_with_goals}

PÓDIO DE PONTUAÇÃO: ${podiumStr}

DETALHE POR TÉCNICO:
${techBlock || "sem técnicos com meta"}

ROTEIRO OBRIGATÓRIO (nesta ordem, 1 insight por item):
1. ATINGIMENTO GERAL — interpretar o % médio da equipe e a razão metas batidas/total.
2. QUEM JÁ BATEU — nomear quem atingiu 100% em quais métricas.
3. QUEM ESTÁ EM RISCO — nomear quem está abaixo, dizer o gap absoluto que falta e${mp ? " o ritmo diário necessário nos dias úteis restantes" : " o esforço necessário"}.
4. VOLUME x QUALIDADE — cruzar chamados resolvidos com CSAT e retrabalho; apontar quem entrega volume sem qualidade ou o contrário.
5. PÓDIO — comentar a disputa de pontuação (distância entre 1º e 4º) e o que explica a liderança.
6. RECOMENDAÇÃO — uma ação concreta e nominal (quem, o quê, quando).

REGRAS:
- Português, tom executivo, 1 a 2 frases por insight, sempre número + interpretação.
- Não invente números. Se algo estiver zerado ou sem base, diga explicitamente.
- Proibido elogio vazio ("continue assim", "parabéns", "manter o ritmo").
- Cite nomes reais.

Responda APENAS um JSON: {"insights": ["frase 1", "frase 2", ...]}`;

    const aiRes = await streamLovableResponse({
      apiKey,
      model: "openai/gpt-5.6-terra",
      input: [
        {
          role: "system",
          content:
            "Você é um analista sênior de performance e metas de equipes de TI. Escreva em português, tom executivo, direto e específico. Sempre combine número com interpretação. Nunca elogios vazios.",
        },
        { role: "user", content: prompt },
      ],
      textFormat: { type: "json_object" },
    });

    if (!aiRes.ok) {
      const txt = aiRes.body;
      console.warn("Lovable AI gateway non-ok", aiRes.status, txt);
      return new Response(JSON.stringify({ insights: [], error: `AI ${aiRes.status}` }), {
        status: aiRes.status === 429 ? 429 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = aiRes.text;
    const parsed = content ? JSON.parse(content) : {};
    const insights = Array.isArray(parsed?.insights) ? parsed.insights.slice(0, 8) : [];

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-goals-analysis error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
