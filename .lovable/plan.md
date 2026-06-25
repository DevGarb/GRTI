## Objetivo

Adicionar uma validação em tempo real na aba **Gráficos & Ranking** que cruza os dados exibidos lá com as trilhas **Chamados** e **Projetos** do mesmo mês/organização, mostrando um banner verde quando tudo bate e um alerta amarelo (com detalhes) quando houver divergência.

## O que validar

Para a trilha ativa (Chamados ou Projetos) no mês/ano selecionados, comparar contra os dados que alimentam as abas Chamados/Projetos (`useMvpChamadosMetrics` / `useMvpMetrics`):

1. **Contagem de colaboradores** no ranking vs no painel da trilha.
2. **Soma de entregas/fechados** (`total_closed` ou `total_deliveries`).
3. **Score final médio** (tolerância ±0,5 pp).
4. **Soma de R$** (apenas Projetos, tolerância R$ 1).
5. **Último ponto da evolução** (mês atual em `get_mvp_evolution_v2`) vs agregados da trilha — confirma que a RPC histórica reflete o mesmo período.
6. **Top 1** do ranking deve coincidir com o `user_id` de maior `final_score` na fonte.

## UX

- Componente `MvpSyncStatusBanner` no topo do conteúdo da aba.
- Estado **OK**: badge verde "Sincronizado com Chamados/Projetos · {mês}/{ano}" + ícone de check.
- Estado **Divergência**: alerta amarelo listando cada checagem falha (ex.: "Entregas: ranking 12 ≠ trilha 14") com botão "Recarregar dados" que invalida as queries.
- Estado **Carregando**: skeleton discreto.
- Roda automaticamente ao trocar trilha/mês.

## Técnico

- Novo arquivo `src/components/projetos/MvpSyncStatusBanner.tsx` recebendo `{ year, month, track, rankingRows, evolutionLastPoint }`.
- A própria fonte de verdade já é `useMvpChamadosMetrics`/`useMvpMetrics` (as duas abas usam isso), então a checagem compara as linhas que `MvpTeamCharts` já tem em mãos com um refetch das mesmas RPCs via `useQueryClient`/hooks — sem nova RPC.
- Integrar o banner no topo de `src/components/projetos/MvpTeamCharts.tsx`, recebendo as linhas já carregadas e o último ponto de evolução.
- Tolerâncias configuráveis em constantes no topo do arquivo.

Sem mudanças em banco, em outras abas ou no fluxo de cálculo.