## Mudanças no módulo Checklists

### 1. Formato de data BR + tempo de conclusão em `ChkRelatorios.tsx`

- Trocar o `target_date` cru (`2026-07-23`) pela versão BR usando `formatDateBR` de `@/lib/dateFormat` (já existente).
- Adicionar uma coluna **Duração** na lista de "Execuções", calculada no client a partir de `completed_at - started_at` (fallback `completed_at - created_at` se `started_at` for nulo). O RPC `get_checklists_report` já retorna esses campos — nenhuma migration necessária.
- Formatação: `Xh Ym` (ex.: `1h 24m`), ou `Ym` se < 1h, e `—` para execuções não concluídas.
- Ajustar também o CSV para incluir a coluna "duração" e usar a data BR.

### 2. Persistência do progresso em `ChkExecutar.tsx`

Estado atual verificado: cada clique em checkbox, upload de foto e marcação N/A já grava no banco via `useSaveChkExecutionItem` (mutation por linha em `chk_execution_items`), e ao remontar a tela o `useChkExecution` refaz o fetch — ou seja, checkbox/foto/N/A já persistem entre saídas e voltas.

O ponto frágil é a **observação (textarea)**: hoje é `defaultValue` + `onBlur`. Se o usuário sair da tela (voltar, trocar de aba, fechar mobile) sem tirar o foco do campo, o texto se perde. Mudanças:

- Tornar o textarea controlado (`value` + `onChange` num state local por item, semeado pelo dado do servidor).
- Auto-save com debounce (~800 ms) de cada observação enquanto o usuário digita, chamando o mesmo `saveItem.mutate({ id, observation })`.
- Manter o save no `onBlur` como fallback imediato.
- Adicionar um pequeno indicador visual "Rascunho salvo" ao lado do progresso, mostrando o momento do último save bem-sucedido (opcional, ajuda o usuário a confiar que pode sair).

Nenhuma mudança no banco, nas RLS ou no fluxo de conclusão. Comportamento de "sair e voltar" passa a preservar 100 % do que foi marcado, comentado e anexado até o botão "Concluir checklist".

### 3. Validação

- `bun run build` ao final.

### Arquivos afetados

- `src/pages/checklists/ChkRelatorios.tsx` (data BR, coluna duração, CSV)
- `src/pages/checklists/ChkExecutar.tsx` (observação controlada + debounce)