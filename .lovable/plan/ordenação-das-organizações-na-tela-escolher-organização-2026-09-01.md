# Ordenação das organizações na tela "Escolher organização"

## Objetivo

Reordenar os cards na tela `EscolherOrganizacao.tsx` para que apareçam na sequência solicitada:

1. T.I
2. OPERACIONAL
3. GRCHECK
4. GESTÃO DE PROCESSOS

## Detalhes técnicos

1. **Arquivo alterado:** `src/pages/EscolherOrganizacao.tsx`.
2. **Mudança:** após carregar `orgs` via `useUserOrganizations`, aplicar uma ordenação explícita por slug usando um mapa de prioridade:
   - `grupo-ramos` → 1
   - `cgps-operacional` → 2
   - `grcheck` → 3
   - `gestao-processos` → 4
3. Organizações sem prioridade definida ficam ao final, preservando a ordem alfabética atual como fallback.
4. Nenhuma alteração de banco ou de hook é necessária — a ordenação por `name` do Supabase será sobrescrita localmente apenas na renderização desta tela.

## Validação

- `bun run build`.
- Preview: entrar com usuário multi-org e conferir a ordem dos cards.
