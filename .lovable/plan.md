# Retrabalho de 6,7% no painel do Felipe

## O que está acontecendo (verificado no banco)

Existe **um** registro de retrabalho real do Felipe: chamado **#147** ("Solicitar a configuração da impressora..."), retrabalho lançado em **31/07/2026**.

O que muda entre as telas é a **data usada para dizer a que mês o chamado pertence**:

- Chamado #147: finalizado (Aguardando Aprovação) em **31/07**, mas só teve o fechamento formal em **06/08**.
- O card pessoal "Minhas Metas" conta pelo `closed_at` (06/08) → o retrabalho cai em **agosto**: 1 de 15 = **6,7%**.
- O painel do admin (Metas / Métricas Gerenciais) conta pela **finalização efetiva** (`aguardando_aprovacao_at`, com fallback para `closed_at`) → o mesmo retrabalho cai em **julho**, por isso agosto aparece zerado.

Ou seja: não é retrabalho inventado, é o mesmo evento contado em meses diferentes por causa de dois critérios distintos de período.

## Correção proposta

Padronizar o card pessoal pelo mesmo critério já usado em todo o resto do sistema (a regra de "finalização efetiva"):

- Considerar chamados com status `Fechado` **ou** `Aprovado`.
- Usar `aguardando_aprovacao_at` (fallback `closed_at`) como data de corte do mês.

Com isso, o card do Felipe em agosto passa a mostrar **0% de retrabalho**, e a quantidade de chamados/pontos do mês fica igual à do painel do admin.

## Detalhes técnicos

- Arquivo: `src/components/metas/MyGoalCard.tsx`.
- Substituir a consulta atual de chamados fechados (filtro `status = 'Fechado'` + `closed_at` entre início/fim do mês) por uma chamada à RPC já existente `get_metas_tecnicos(_year, _month)`, filtrando a linha do usuário logado. Ela já devolve `total_closed`, `total_points`, `avg_score`, `preventivas_done`, `rework_count` e o tempo médio pela mesma regra do painel gerencial.
- Manter o cálculo de `rework_percent` como `rework_count / total_closed * 100`, e `avg_resolution_hours` a partir de `total_work_minutes / timed_tickets_count`.
- Manter intacto o restante do card (radar, barras, metas, projetos entregues) — muda só a origem dos números.
- Rodar `bun run build` ao final.
