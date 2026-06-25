## Objetivo

Tornar a aba **Metas → MVP** funcional de ponta a ponta, com **duas trilhas independentes de premiação** (Chamados e Projetos) sincronizadas com os dados reais.

---

## 1. Trilhas de Premiação

Cada colaborador pode concorrer/ganhar em uma ou nas duas trilhas no mesmo mês:

| Trilha | Fonte | Prêmios |
|---|---|---|
| **Chamados** | `tickets` + `evaluations` + `ticket_history` | Prata ≥ 90% (R$ 300) · Ouro = 100% (R$ 500) |
| **Projetos** | `project_tasks` + `sprints` (lógica atual) | Prata ≥ 90% (R$ 300) · Ouro = 100% (R$ 500) |

Penalidades (`mvp_penalties`) continuam aplicando por trilha conforme `scope` (`mvp`/`operacional`).

---

## 2. Fórmula da trilha Chamados

Considera chamados `Fechado` no mês do colaborador (`assigned_to`):

```text
on_time_rate     = fechados dentro do due_date ÷ total fechados
csat_rate        = AVG(evaluations.score WHERE type='satisfaction') × 20   (1-5 → %)
rework_rate      = retrabalhos válidos ÷ total fechados
                   (ignora ticket_history.action='rework_invalidated')
category_points  = SUM(categories.score) dos chamados fechados (exibido, não entra no %)

final_chamados   = on_time_rate × (csat_rate / 100) × (1 − rework_rate) × 100
```

Sem CSAT no mês → usa 100% (não pune quem não recebeu avaliação).

---

## 3. Mudanças no Banco

### Migration única
- **`get_mvp_chamados_metrics(_org, _year, _month)`** — nova RPC retornando linhas com `user_id, full_name, total_closed, on_time, on_time_rate, csat_avg, csat_count, csat_rate, reworks, rework_rate, category_points, final_score, award_level, amount_brl`.
- **`get_mvp_metrics`** (existente) — mantida intacta para a trilha Projetos.
- **`mvp_awards`**: adicionar coluna `track text NOT NULL DEFAULT 'projetos'` (`'chamados'` ou `'projetos'`) e trocar `UNIQUE(user_id, organization_id, year, month)` por `UNIQUE(user_id, organization_id, year, month, track)`. Backfill nas linhas atuais como `'projetos'`.
- **`compute_mvp_awards`**: estender para receber `_track text` opcional (default `'ambas'`); itera nas duas RPCs e grava com `track` correspondente, aplicando penalidades.
- **`approve_mvp_award`**: sem mudança (chave já é id).
- **`get_mvp_individual` / `get_mvp_team_ranking`**: retornar bloco `chamados` em paralelo ao `projetos` (mesma estrutura).

### GRANTs
Garantir `GRANT EXECUTE` nas novas funções para `authenticated`.

---

## 4. Mudanças na UI

### `src/pages/projetos/ProjetosMVP.tsx` (acessada via `/metas/mvp`)
- Adicionar **seletor de trilha** (Tabs internos: "Chamados" / "Projetos") acima da Tabela.
- Cada trilha mostra sua própria tabela, KPIs (Total aprovado, Ouros, Pratas) e botões de aprovar/rejeitar.
- Botão **Recalcular mês** passa a calcular as duas trilhas de uma vez.
- Subtítulo da página atualizado para refletir duas trilhas.

### `src/pages/projetos/ProjetosMeuMVP.tsx` (acessada via `/metas/meu-mvp`)
- Cabeçalho passa a mostrar **dois cards de premiação lado a lado** (Chamados / Projetos), cada um com seu Final %, nível e valor.
- Grid de KPIs ganha seção "Chamados" (entregas no prazo, CSAT, retrabalhos, pontos por categoria) acima da seção "Projetos" atual.
- "Projeções" mostra o que falta para Ouro em cada trilha.

### Hooks
- `useMvpMetrics` (em `useProjetosDashboard.ts`) → renomear retorno para `projetos` e criar irmão `useMvpChamadosMetrics`.
- `useMvpIndividual` → tipo passa a expor `{ chamados, projetos }`.
- `useMvpTeamRanking` → idem.

---

## 5. Validação

1. Rodar `compute_mvp_awards` para o mês corrente e conferir se aparecem 2 linhas por colaborador em `mvp_awards` (track chamados + projetos).
2. Abrir `/metas/mvp` como admin: trocar entre tabs, aprovar uma premiação de cada trilha.
3. Abrir `/metas/meu-mvp` como técnico (Felipe/Izabele) e confirmar que a trilha Chamados tem peso real e a de Projetos fica zerada/baixa.
4. Mesma checagem como dev (Danilo/Victor) confirmando trilha Projetos forte e Chamados com volume menor.
5. Aplicar uma penalidade de scope `mvp` e ver redução só na trilha correspondente.

---

## Resumo técnico das alterações

- **DB**: 1 migration (nova RPC chamados, coluna `track`, ajuste UNIQUE, update em `compute_mvp_awards`, `get_mvp_individual`, `get_mvp_team_ranking`).
- **Frontend**: 2 páginas (`ProjetosMVP.tsx`, `ProjetosMeuMVP.tsx`) + 2 hooks (`useProjetosDashboard.ts`, `useMvpExtra.ts`).
- **Sem mudanças** em: lista de chamados, projetos, sprints, penalidades.
