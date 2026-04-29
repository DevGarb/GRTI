## Problema

No modal/tela do QR Code (`/asset/:id`), quando há preventiva registrada mas o tipo do equipamento ainda **não tem intervalo cadastrado** em `maintenance_intervals`, o card de manutenção mostra **"Sem intervalo configurado"** em vez de iniciar a contagem regressiva.

Confirmado: a tabela `maintenance_intervals` está vazia hoje, então **todo** patrimônio cai nesse fallback.

A regra de negócio definida é: ao registrar a primeira preventiva, deve começar a contagem de **90 dias** automaticamente para a próxima — ou seja, 90 dias é o padrão quando não houver intervalo específico.

## Solução

Tratar 90 dias como **valor padrão implícito** sempre que `maintenance_intervals` não tiver registro para aquele `equipment_type`. A coluna `interval_days` já tem `DEFAULT 90` no banco, então não há mudança de schema — só de lógica.

### 1. Edge function `get-public-asset`

Em `supabase/functions/get-public-asset/index.ts`, ao consultar o intervalo:

- Se `maintenance_intervals` não retornar linha para o `equipment_type` do patrimônio, devolver `maintenance_interval_days = 90` (em vez de `null`).
- Adicionar um campo opcional `maintenance_interval_source: 'configured' | 'default'` para o frontend poder sinalizar visualmente que o valor é o padrão (útil mais tarde, sem alterar comportamento).

### 2. Frontend `AssetPublicView.tsx`

Como agora o intervalo nunca virá `null` (sempre vem 90 no mínimo), o caminho `health === "none" && last` (que produzia "Sem intervalo / configurado para este tipo") deixa de ser alcançado. Mantemos defesa redundante:

- Em `computeMaintenanceHealth`, se `intervalDays` vier `null/undefined`, assumir `90` antes do cálculo.
- Quando o intervalo for o padrão de 90 dias e não houver registro em `maintenance_intervals`, exibir um pequeno texto auxiliar logo abaixo da próxima data: **"Intervalo padrão (90 dias) — configure em Preventivas › Intervalos para personalizar."** (somente se `maintenance_interval_source === 'default'`).

### 3. Sem migrations

Nada muda no schema. A tabela `maintenance_intervals` continua opcional — passa a funcionar como override do padrão de 90 dias.

## Comportamento resultante

- Patrimônio **com preventiva** + tipo **sem intervalo cadastrado** → conta regressiva de 90 dias a partir da última preventiva (ex.: "prox em 80 dias"), com nota discreta de que é o padrão.
- Patrimônio **com preventiva** + tipo **com intervalo cadastrado** → comportamento atual (usa o valor configurado).
- Patrimônio **sem nenhuma preventiva** → continua mostrando "Nenhuma preventiva registrada" (como hoje).

## Arquivos a alterar

- `supabase/functions/get-public-asset/index.ts` — fallback para 90 e novo campo `maintenance_interval_source`.
- `src/pages/AssetPublicView.tsx` — defesa redundante no helper, leitura do novo campo, microcopy auxiliar.
