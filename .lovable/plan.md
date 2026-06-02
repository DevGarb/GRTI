## Problema
Na tela **Chamados** (mostrada no screenshot), os chamados abertos em maio e fechados em junho **não aparecem** no mês de junho com a pontuação. A regra híbrida foi aplicada em outras telas (Dashboard, Metas dos Técnicos, MyGoalCard) mas **a página Chamados ainda filtra tudo por `created_at`**.

## O que vou ajustar

### 1. `src/pages/Chamados.tsx` — aplicar regra híbrida no filtro do mês
Hoje (linhas 277-289), a lista filtra por `created_at` no mês e mantém qualquer pendente. Um chamado de maio fechado em junho não bate nenhum dos critérios e **some**.

Mudança:
- **Abertos / pendentes:** continuam por `created_at` no mês selecionado (mantém o comportamento dos badges `mai/26`, `abr/26` que já aparecem).
- **Fechados:** passam a filtrar por `closed_at` no mês selecionado (com fallback para `updated_at` se `closed_at` for nulo em chamados antigos).
- Resultado: chamado criado em maio, fechado em junho, aparece em junho com status "Fechado" e pontuação.

### 2. `src/pages/Chamados.tsx` — corrigir `closedByMe` (pontuação do técnico no topo)
Linhas 292-296 calculam "Pontuação do mês" do técnico filtrando por `created_at`. Precisa mudar para `closed_at` no mês — assim o ticket de maio fechado em junho conta os pontos em junho, igual à função `get_metas_tecnicos` e ao `MyGoalCard`.

### 3. `src/pages/Auditoria.tsx` — confirmar que já está correto
A aba **Chamados** da Auditoria já faz duas queries (abertos por `created_at`, fechados por `closed_at`) e une os resultados. **Vou validar** que está realmente trazendo o ticket de maio fechado em junho rodando uma query no banco antes/depois — se faltar algo (ex: a coluna `closed_at` está nula em chamados antigos), adiciono um fallback por `updated_at` quando `closed_at IS NULL AND status = 'Fechado'`.

## Validação
- Rodar consulta SQL identificando chamados com `created_at` em maio/2026 e `closed_at` em junho/2026 e conferir nominalmente que aparecem em:
  - Chamados (mês = junho)
  - Auditoria → aba Chamados (mês = junho)
  - Metas dos Técnicos (junho) — já está OK pela função
- Conferir que o badge de mês de origem (`mai/26`) continua aparecendo para esses chamados, deixando claro que nasceram em maio.

## Fora do escopo
- Nenhuma alteração em banco / RPC / RLS.
- Nenhuma mudança no que conta como "pendente" ou nos status existentes.
- Sem mudanças visuais além do que o filtro híbrido naturalmente reflete (mesma tabela, mesmas colunas).