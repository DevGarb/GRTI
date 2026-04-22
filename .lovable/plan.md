
Objetivo: eliminar a origem errada da pontuação e deixar todos os lugares do sistema calculando pontos da mesma forma.

1. Diagnóstico confirmado
- Os pontos do quadro “Acompanhamento Detalhado por Técnico” estão vindo de `src/pages/Dashboard.tsx`, pela coluna `tech.points`.
- Esse valor vem de `src/hooks/useDashboardMetrics.ts`, que hoje soma registros da tabela `evaluations` com `type = 'meta'`.
- No banco, os pontos atuais de abril já batem com o que aparece na tela:
  - MARIA IZABELE LIMA: 191 pts
  - FELIPE AUGUSTO: 152 pts
  - VICTOR HUGO CORIOLANO BORGES: 120 pts
  - DANILO NASCIMENTO: 113 pts
- Também confirmei que ainda existem 7 avaliações `meta` de abril divergentes do `score` real da categoria do chamado.
- Há uma causa histórica importante: a migration `supabase/migrations/20260309201900_d584794f-6fb8-4ae4-831e-44ca19860ae2.sql` classificou os tipos invertidos:
  - `score <= 5` virou `meta`
  - `score > 5` virou `satisfaction`
  Isso é o oposto da regra correta de CSAT 1–5 e contaminou dados antigos.

2. Correção no banco de dados
- Criar uma nova migration corretiva para:
  - identificar avaliações `meta` que na verdade eram CSAT;
  - copiar esses valores para `type = 'satisfaction'` quando ainda não existir satisfação para o chamado;
  - recalcular `score` das avaliações `meta` usando o `categories.score` do chamado;
  - corrigir `type` de registros históricos impactados pela migration invertida.
- Adicionar proteção para evitar o problema voltar:
  - índice único por `(ticket_id, type)` na tabela `evaluations`, para existir no máximo uma `meta` e uma `satisfaction` por chamado;
  - trigger de validação em `evaluations`:
    - `satisfaction` só aceita nota de 1 a 5;
    - `meta` deve usar o score real da categoria do chamado.

3. Unificar a regra de pontos no frontend
- `src/hooks/useDashboardMetrics.ts`
  - parar de somar pontos apenas por `evaluations.created_at`;
  - calcular pontos a partir do conjunto de chamados do mês selecionado, para a coluna “Chamados” e a coluna “Pts” usarem a mesma base;
  - deduplicar por chamado, usando só a avaliação `meta` válida daquele ticket.
- `src/pages/Dashboard.tsx`
  - manter a tabela “Acompanhamento Detalhado por Técnico” ligada à regra unificada;
  - garantir que o ranking e a tabela usem exatamente a mesma fonte de pontos.
- `src/pages/Chamados.tsx`
  - alinhar “Minha Pontuação” com a mesma regra do dashboard;
  - contar apenas chamados fechados do período filtrado e apenas `meta`.
- `src/pages/MetasTecnicos.tsx`
  - aplicar o filtro de mês/ano de verdade nos tickets e nas pontuações;
  - parar de buscar tudo sem recorte temporal;
  - usar só a `meta` válida por ticket.

4. Blindar o fluxo correto de negócio
- `src/components/TicketDetailModal.tsx`
  - manter separado:
    - solicitante aprova + dá CSAT 1–5 (`satisfaction`);
    - admin apenas pontua categoria (`meta`);
  - impedir nova gravação `meta` se o chamado já tiver sido pontuado;
  - garantir que o fechamento só aconteça após a pontuação do admin.

5. Corrigir os erros de build que hoje impedem a entrega limpa
- `supabase/functions/api-gateway/index.ts`
  - separar o fluxo de detalhe e lista para não quebrar a tipagem do builder em `.single()`.
- `supabase/functions/check-sla/index.ts`
- `supabase/functions/create-user/index.ts`
- `supabase/functions/delete-user/index.ts`
- `supabase/functions/dispatch-webhook/index.ts`
- `supabase/functions/send-whatsapp/index.ts`
- `supabase/functions/test-webhook/index.ts`
  - tratar `catch (error: unknown)` corretamente antes de acessar `.message`.

Resultado esperado após aplicar
- Pontos passam a vir somente da pontuação do admin por categoria.
- CSAT 1–5 deixa de impactar qualquer ranking de pontos.
- Dashboard, Chamados e Metas Técnicos mostram o mesmo total para o mesmo período.
- Dados históricos contaminados ficam corrigidos no banco.
- O projeto volta a compilar sem erro.
