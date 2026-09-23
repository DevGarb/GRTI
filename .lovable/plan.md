# Painel de TV — Preventivas planejadas x realizadas

## Objetivo
Exibir no painel de TV um card com o total de preventivas planejadas vs realizadas no mês (com percentual) e, nos cards da "Equipe Agora", mostrar para cada técnico (ex.: Felipe e Izabele) suas preventivas planejadas e realizadas — assim como os desenvolvedores já exibem projetos.

## Estado atual (confirmado)
- A edge function `tv-dashboard` já calcula `preventivas_month: { total, feitas, pendentes, atrasadas }` (planejadas = ativos ativos com intervalo cadastrado; feitas = execuções no mês), mas o frontend `TvDashboard.tsx` não renderiza esse dado.
- `team_status` já existe e exibe por pessoa: fechados, andamento, sem iniciar e projetos (devs). Não há preventivas por técnico.
- `preventive_maintenance` tem `created_by` (quem executou) e `responsible` (texto); o planejado é por ativo (`patrimonio` + `maintenance_intervals`), não por técnico.

## Mudanças

### 1. Edge function `supabase/functions/tv-dashboard/index.ts`
- Manter `preventivas_month` e adicionar `percent` (feitas/total × 100, 0 se total = 0).
- Em `team_status`, adicionar por membro:
  - `prev_feitas`: preventivas do mês com `created_by = técnico`.
  - `prev_planejadas`: ativos ativos com preventiva devendo no mês (vencidos ou vencendo dentro do mês corrente) cujo último executor (`created_by` da preventiva mais recente do ativo) é o técnico; se o ativo nunca teve preventiva, conta para o planejado geral, não individual.
  - `prev_titles`: até 12 etiquetas (asset_tag) das preventivas feitas no mês, para o hover.

### 2. Frontend
- `src/pages/TvDashboard.tsx`: novo card KPI "Preventivas do Mês" exibindo `feitas / total` e o percentual de realização (ex.: "12/20 · 60%"), com cor dinâmica (verde ≥ 90%, âmbar ≥ 60%, vermelho abaixo). Posicionado na fileira de KPIs do topo.
- `src/components/tv/TeamStatusPanel.tsx`:
  - Novo bloco no card do membro (visível quando `prev_planejadas > 0` ou `prev_feitas > 0`): ícone de ferramenta, label "Preventivas", valor `feitas/planejadas`.
  - No hover, lista "Preventivas feitas" com os asset_tags.

### 3. Validação
- Conferir com uma query os números de preventivas do mês por técnico (Felipe/Izabele) para validar a agregação.
- Rodar `bun run build`.

## Detalhes técnicos
- Regra de "planejada por técnico" usa o último executor do ativo como responsável de fato — é a melhor aproximação disponível sem criar uma tabela de planejamento por técnico. Se preferir outra regra (ex.: campo `responsible` da preventiva), ajustamos depois.
- Sem mudanças de schema nem de RLS; apenas leitura das tabelas existentes.
