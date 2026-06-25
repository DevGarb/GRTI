## Diagnóstico

A aba **Gráficos & Ranking** (`MvpTeamCharts.tsx`) usa RPCs antigas (`get_mvp_team_evolution`, `get_mvp_team_ranking`) criadas antes da reforma das duas trilhas (Chamados/Projetos). Por isso:

- A "Evolução mensal" vem vazia (a RPC só lê dados antigos de `mvp_awards` agregados, sem separar trilha).
- "Entregas vs Retrabalhos" e "Retrabalhos por colaborador" ficam zerados.
- "Qualidade técnica" mostra 100% fixo (não bate com os valores reais das tabelas Chamados/Projetos).
- "Ranking de Sprints/Projetos" não considera os projetos concluídos via `CompleteProjectModal` nem a soma de valores.

Ou seja: a tela existe mas está desconectada do resto. Preciso decidir entre **melhorar** (sincronizar) ou **excluir**.

---

## Opção A — Melhorar e sincronizar (recomendada)

Refazer a aba consumindo os mesmos dados que já alimentam as abas Chamados e Projetos (`get_mvp_chamados_metrics` + `get_mvp_metrics`), trazendo valor real:

**Conteúdo proposto:**

1. **Toggle de trilha** no topo: `Chamados | Projetos | Consolidado`.
2. **Evolução mensal (últimos 3/6/12 meses)** — nova RPC `get_mvp_evolution_v2(track, months_back)` que itera os meses e roda as métricas atuais, plotando: Score final médio, % no prazo, % retrabalho.
3. **Ranking de colaboradores do mês** (cards/tabela):
   - Trilha Chamados: fechados, no prazo %, CSAT, retrabalho %, pontos cat. → ordenado por Final.
   - Trilha Projetos: entregas, no prazo %, qualidade %, retrabalho %, R$ acumulado → ordenado por Final.
4. **Top 3 do mês com medalhas** (Ouro/Prata) já calculados em `mvp_awards`.
5. **Gráfico "Valor R$ aprovado por colaborador"** (trilha Projetos).
6. **Gráfico "CSAT vs Retrabalho"** scatter (trilha Chamados).
7. Remover charts vazios atuais (Retrabalhos/Qualidade isolados) — substituídos pelos novos.

**Técnico:**
- Migration nova: `get_mvp_evolution_v2(_organization_id, _track, _months_back)` que reaproveita lógica das RPCs existentes.
- Reescrever `src/components/projetos/MvpTeamCharts.tsx` consumindo `useMvpMetrics`/`useMvpChamadosMetrics` (já existem) + a nova RPC de evolução.
- Atualizar `src/hooks/useMvpExtra.ts` (substituir `useMvpEvolution`/`useMvpTeamRanking` por versões com track).
- Sem mudanças em outras telas.

---

## Opção B — Excluir a aba

- Remover o `<TabsTrigger value="graficos">` e o `<TabsContent>` em `src/pages/projetos/ProjetosMVP.tsx`.
- Remover `src/components/projetos/MvpTeamCharts.tsx`.
- Manter (opcional) `MvpSimulator` na aba Simulador.
- Deixar `useMvpEvolution`/`useMvpTeamRanking` órfãos no hook (ou removê-los).

Rápido, mas perde a visão histórica/comparativa entre meses.

---

**Qual caminho seguir?** Minha recomendação é a **Opção A** — temos os dados, só falta plugar; vira a tela de "visão executiva" da premiação.