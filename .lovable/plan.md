# Corrigir agrupamento de chamados (Bruna aparecendo como técnica)

## Diagnóstico

Na aba **Chamados** (admin), os cards são agrupados por técnico responsável. Em `src/pages/Chamados.tsx` (linhas 298–303) o agrupamento está assim:

```ts
const name = t.assignedProfile?.full_name
  || t.creatorProfile?.full_name   // ← fallback errado
  || "Sem atribuição";
```

Esse fallback fazia sentido no fluxo antigo, quando todo chamado já nascia com técnico. Depois da mudança em que **chamados nascem em "Aberto" sem técnico**, o fallback passou a usar o nome do **solicitante** — então a Bruna (colaboradora) virou um "card de técnico" só porque abriu o chamado *teste*.

## Correção

Remover o fallback para `creatorProfile`. Tickets sem técnico atribuído ficam num único grupo:

```ts
const name = t.assignedProfile?.full_name || "Sem técnico atribuído";
```

Resultado:
- Bruna deixa de aparecer como técnica.
- Todos os chamados em "Aberto" (sem técnico) ficam agrupados no card **"Sem técnico atribuído"** — útil para o admin ver de relance o backlog não atribuído.
- Técnicos reais (Maria, Felipe, Danilo, Victor, Gabriel Caminha, Gabriel Porto) continuam com seus próprios cards normalmente.

## Arquivo afetado

- `src/pages/Chamados.tsx` — única alteração, 1 linha (remover o `|| t.creatorProfile?.full_name`).

## Fora de escopo

- Não mexo em RLS, queries ou outras telas.
- Não altero a lógica do timer/SLA recém-implementada.

Posso aplicar?
