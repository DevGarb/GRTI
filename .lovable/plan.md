# Ajustar layout do painel "Entregas por desenvolvedor"

## O problema

O usuário quer que cada linha do painel "Entregas por desenvolvedor" siga exatamente o formato visual:

> **Danilo Nascimento - 8 itens [barra de progressão] - Porcentagem do que fez do total de itens - Em dev OK - Dt. Último item concluído.**

Hoje a linha já mostra nome, entregues, barra de participação, em dev e data, mas:
- A porcentagem atual (`pctItems`) mede a participação do dev **entre os itens concluídos**, não do **total de itens do projeto**.
- O layout ainda está em formato de tabela, não na leitura horizontal/densa que o usuário pediu.

## O que será feito

1. **Ajustar `src/hooks/useProjectDelivery.ts`**
   - Adicionar um campo `pctItemsOfTotal` (ou `pctItemsProject`) em `DevDelivery`: percentual de itens concluídos pelo dev em relação ao total de itens do projeto (`totalTasks`).
   - Manter `pctItems` existente (participação entre concluídos) caso outros lugares usem.

2. **Refazer a linha de desenvolvedor em `src/components/projetos/ProjectOverview.tsx`**
   - Layout horizontal compacto:
     - Nome + avatar
     - "X itens" (entregues)
     - Barra de progresso com a nova porcentagem do total de itens do projeto
     - Percentual textual ao lado da barra
     - Indicador "Em dev OK" (badge com a quantidade de itens em desenvolvimento, ou "OK" quando zero)
     - Data da última entrega (formato BR)
   - Remover as colunas excessivas e centralizar tudo na linha solicitada.
   - Manter o rodapé com totais do time.

3. **Validação**
   - `bun run build` ao final.

## Arquivos envolvidos

- `src/hooks/useProjectDelivery.ts`
- `src/components/projetos/ProjectOverview.tsx`

## Critérios de aceitação

- Cada linha mostra: nome, quantidade de itens entregues, barra de progresso, % do total de itens do projeto, indicador de em dev e data da última entrega.
- A % do progresso é calculada sobre o total de itens do projeto, não sobre o total de itens concluídos.
- Build passa sem erros.
