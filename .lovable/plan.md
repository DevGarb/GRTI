# Evolução da tela Métricas Gerenciais

Transformar a tela atual (tabela operacional + config de envio D-1) em um **painel executivo** que responde em <30s: "Como foi a operação hoje e o que comunicar à diretoria?".

## 1. Resumo Executivo do Dia (topo fixo)

Substituir a faixa atual de 8 KPIs por uma faixa principal com cards grandes:

- Chamados Finalizados, Em Andamento, Aguardando Aprovação, Backlog (Abertos + Em Andamento + Aguardando)
- CSAT Médio, TMA Médio, Pontuação Total, Técnicos Ativos, Índice de Retrabalho

Ao lado, **badge de Status Operacional** semafórico:
- 🟢 Normal — backlog ≤ média móvel 7d e aguardando aprovação < 20% do backlog
- 🟡 Atenção — backlog 10-30% acima da média OU >30% aguardando aprovação
- 🔴 Crítico — backlog >30% acima da média OU retrabalho >20% OU chamados estourando SLA de horário comercial

Regras encapsuladas em util `computeOpStatus()` reutilizável pelo edge function de resumo.

## 2. Insights Automáticos (card destacado)

Novo card "Insights do dia" gerado por IA via Lovable AI Gateway (google/gemini-2.5-flash) na edge function `generate-daily-insights`. Recebe métricas agregadas + variação D-1, retorna lista de bullets com:
- Técnico destaque (mais fechados ponderado por CSAT)
- Melhor CSAT
- Técnicos com mais pendências
- Variação de backlog vs dia anterior
- Risco operacional detectado
- Comparativo com ontem

Cache por org+período em `daily_insights_cache` (nova tabela) para evitar regerar.

## 3. Ranking da Equipe

Substituir tabela por **cards de ranking** ordenáveis (Fechamentos | CSAT | Menor retrabalho):
- Avatar + Nome (medalha 🥇🥈🥉 nos 3 primeiros)
- Métricas em linha: Fechados, Em andamento, Aguardando, CSAT, TMA, Retrabalho
- Badge de status individual: Excelente / Bom / Atenção / Crítico (regra: CSAT≥4.5 & retrabalho<10% = Excelente; retrabalho>20% ou CSAT<3 = Crítico)

## 4. Resumo Individual (expansível)

Cada card de técnico vira `<Collapsible>`. Ao expandir:
- KPIs detalhados (Fechados, Em andamento, Aguardando, Total atribuídos, CSAT, TMA, Retrabalho)
- Frase-resumo gerada pelo mesmo edge function de insights (1 frase por técnico)

## 5. Resumo WhatsApp

Nova seção "Resumo Executivo" com:
- Botão **[Gerar Resumo Executivo]** → chama edge function `generate-executive-summary` que monta o texto formatado (emojis, seções, destaques, riscos)
- Textarea com o texto pronto
- Botões **[Copiar Resumo]** e **[Enviar para Webhook agora]**

Formato segue o template do briefing (emojis 📊✅🔄⏳⭐⏱️🏆⚠️).

## 6. Webhook /api/metrics/daily-summary

Estender a edge function existente `send-management-report` para emitir o novo payload enriquecido:

```json
{
  "period": "2026-06-01",
  "generated_at": "...",
  "overall": { "closed", "in_progress", "pending_approval", "backlog", "csat", "tma", "score", "rework_pct", "op_status" },
  "highlights": ["..."],
  "risks": ["..."],
  "technicians": [{ "name", "closed", "in_progress", "pending_approval", "csat", "tma", "summary" }],
  "whatsapp_message": "texto completo"
}
```

Mantém compatibilidade: campos antigos permanecem.

## 7. Automação (envio agendado)

A seção atual de config evolui:
- Switch "Enviar resumo automaticamente" (já existe `is_active`)
- Horário (já existe `send_time`) — default 18:00
- Destino: **Webhook** (atual). Para WhatsApp / Grupo Corporativo o usuário usa o webhook → n8n (fluxo descrito no briefing; nada novo no app).
- Cron `pg_cron` existente já dispara `send-management-report`; vamos só validar que respeita o `send_time` configurado por org.

## Detalhes técnicos

**Banco (migration):**
- Tabela `daily_insights_cache (organization_id, reference_date, insights jsonb, summary_text text, created_at)` com RLS por org + GRANTs.
- RPC `get_executive_summary(_org, _from, _to)` que devolve agregados consolidados (backlog total, técnicos ativos, variação D-1) — extensão do `get_management_metrics` atual.

**Frontend (arquivos):**
- `src/pages/MetricasGerenciais.tsx` — refatorado em seções
- `src/components/metricas/ExecutiveSummary.tsx` (KPIs + status semafórico)
- `src/components/metricas/InsightsCard.tsx`
- `src/components/metricas/TeamRanking.tsx` + `TechnicianCard.tsx`
- `src/components/metricas/WhatsappSummary.tsx`
- `src/lib/opStatus.ts` (regras de status semafórico — compartilhado com edge)
- `src/hooks/useExecutiveSummary.ts`, `useDailyInsights.ts`

**Edge functions:**
- `generate-daily-insights` (nova) — Lovable AI Gateway, cacheia em `daily_insights_cache`
- `generate-executive-summary` (nova) — monta texto WhatsApp
- `send-management-report` (estendida) — inclui novos campos no payload

**Design:**
- Cards grandes, tipografia destacada nos números
- Cores semafóricas via tokens (`--status-ok`, `--status-warn`, `--status-critical` em `index.css`)
- Layout responsivo: grid 4 cols desktop, 2 cols tablet, 1 col mobile
- Medalhas no top-3 do ranking

## Fora de escopo
- Integração direta com WhatsApp Business (segue via n8n pelo webhook)
- Alterações no cálculo base de métricas (`get_management_metrics`) além de extensão para backlog/técnicos ativos
- Histórico/tendência além da comparação D vs D-1
