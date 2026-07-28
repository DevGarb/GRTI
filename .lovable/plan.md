## Problema

A tela **MVP Equipe** (`/metas/mvp`) hoje calcula "No prazo" com `closed_at <= due_date`. Como `due_date` quase nunca é preenchido, todo mundo fica com % baixíssimo (Felipe 4,23%, Maria 10,22%), o `final_score` nunca atinge 90/100, e por isso `compute_mvp_awards` grava `award_level='none'` e `amount_brl=0` → "Total aprovado R$ 0" e nenhum Ouro/Prata. A tela de **Metas** usa outra lógica (metas atingidas vs. `performance_goals`), então os números não batem.

## Solução

Reescrever o cálculo do MVP Chamados para espelhar exatamente a tela de Metas: **final_score = (metas individuais atingidas / metas individuais definidas) × 100**, considerando só técnicos com meta definida no mês.

### 1. Migration: reescrever `get_mvp_chamados_metrics`

Novo corpo (mesma assinatura de retorno para não quebrar frontend/`compute_mvp_awards`):

- Base de técnicos: apenas `user_id` que tenham linhas em `performance_goals` com `target_type='individual'`, `organization_id = _organization_id`, `year = _year`, `month = _month`.
- Para cada técnico, reaproveitar as métricas já expostas por `get_metas_tecnicos(_year, _month)`:
  - `tickets_closed` ← `total_closed`
  - `points` ← `total_points`
  - `avg_score` ← `avg_score` (com `evaluations_count`)
  - `avg_resolution_hours` ← `total_work_minutes / timed_tickets_count / 60`
  - `preventivas_done` ← `preventivas_done`
- Para cada meta do técnico, comparar `current` vs `target_value`:
  - Métricas normais (maior é melhor): atingida quando `current >= target`.
  - Métricas inversas (`avg_resolution_hours`): atingida quando `current <= target` (só conta se `timed_tickets_count > 0`; sem tickets cronometrados → não computa nem no numerador nem no denominador para não distorcer).
- `final_score = ROUND(metas_atingidas * 100.0 / NULLIF(metas_totais,0), 2)`.
- Colunas preenchidas assim (mantendo nomes existentes):
  - `on_time_rate` = `final_score` (a coluna passa a exibir "% de metas atingidas" no ranking).
  - `csat_rate` = `avg_score * 20` (0–100) para o `compute_mvp_awards` continuar funcionando com o campo `quality_rate`.
  - `csat_avg`, `csat_count`, `rework_rate`, `category_points`, `total_closed` continuam calculados a partir de `get_metas_tecnicos` + `ticket_history` (retrabalho já existe lá como `rework_count`).
  - `award_level`/`amount_brl`: mesma regra de faixa (≥100 Ouro R$500, ≥90 Prata R$300, senão none) — sem alteração no `compute_mvp_awards`.

Concessões e RLS: função continua `SECURITY DEFINER`, sem novas tabelas, sem novos GRANTs necessários.

### 2. Ajustes no frontend `src/pages/projetos/ProjetosMVP.tsx`

- Renomear o cabeçalho da coluna **"No prazo"** para **"Metas atingidas"** (na aba Chamados).
- Manter as demais colunas e o layout de premiação intactos.
- `awards.status = 'pendente'` continuará gerando `R$ 0` até o admin aprovar em cada linha — nada muda aqui, só volta a existir Ouro/Prata para aprovar.

### 3. Recalcular julho/2026

Após a migration passar, orientar o usuário a clicar em **"Recalcular mês"** na aba MVP Equipe para regravar `mvp_awards`. Um `SELECT compute_mvp_awards(...)` também pode ser rodado direto se preferir; a lista fica pendente aguardando aprovação por linha (fluxo existente).

## Verificação

- `bun run build`.
- `SELECT * FROM get_mvp_chamados_metrics('<org T.I>', 2026, 7)` deve retornar apenas Felipe, Victor, Danilo e Maria (os quatro com metas), com `final_score` batendo os %s da tela de Metas (Felipe 100, Maria 97, Victor 93, Danilo 93 — dentro do que a query devolver).
- Após recalcular, `mvp_awards` deve ter pelo menos Felipe como `award_level='ouro'` e `amount_brl=500` (pendente para aprovação).

## Detalhes técnicos

- Único arquivo SQL alterado: função `public.get_mvp_chamados_metrics` (via `supabase--migration`).
- Único arquivo TS alterado: `src/pages/projetos/ProjetosMVP.tsx` (rename do header).
- Nenhuma mudança em `compute_mvp_awards`, `mvp_awards`, `performance_goals`, hooks ou RLS.
- `get_metas_tecnicos` já retorna tudo que precisamos; usamos como CTE dentro da nova função para não duplicar lógica de horas úteis.
