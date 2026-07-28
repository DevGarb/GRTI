## Problema

Ao rodar "Fechar Aprovados com IA" com 100 chamados, a edge function `close-approved-tickets-ai` quebra com `Http: connection closed before message completed` — timeout de resposta enquanto a function ainda está processando batches sequenciais da OpenAI.

**Causa raiz:** o `preview` roda `for` sequencial em batches de 15 → ~7 chamadas seguidas ao `gpt-4o-mini` + montagem de tratativas. Isso ultrapassa o tempo de resposta antes de devolver o JSON.

## Correção

Manter **`OPEN_AI_KEY` e OpenAI `gpt-4o-mini`** exatamente como estão. Apenas otimizar como os batches são executados, sem mudar UI, prompt, rubrica ou lógica de apply.

### Ajustes em `supabase/functions/close-approved-tickets-ai/index.ts`

1. **Paralelizar batches de IA no `preview`**
   Substituir o loop `for` sequencial (linhas ~263-269) por execução em paralelo com concorrência limitada (5 batches por vez, via pool simples com `Promise.all`). Isso reduz o tempo total do preview de ~N×latência para ~ceil(N/5)×latência.

2. **Reduzir `BATCH` de 15 → 8**
   Batches menores respondem mais rápido e reduzem o risco de a IA truncar/estourar o `response_format` JSON num único request. Combinado com item 1, o preview de 100 chamados passa a rodar ~3 rounds de 5 batches em paralelo.

3. **Timeout defensivo por batch**
   Envolver cada `fetch` da OpenAI em `AbortSignal.timeout(45_000)`. Se um batch travar/lentão, ele falha isolado (fallback: score 2 / categoria genérica, que já existe no código) em vez de derrubar a request inteira.

4. **Encurtar payload por chamado**
   Reduzir a descrição enviada de 300 → 200 chars e o `CHAR_BUDGET` de tratativas de 600 → 400 chars em `buildTratativa`. Menos tokens = latência menor por batch, sem perder o sinal da tratativa mais recente que a rubrica usa.

Nada muda no `apply`, no `AiCloseApprovedModal.tsx`, no schema, nem no secret usado (`OPEN_AI_KEY` continua).

### Verificação

- `bun run build` no final.
- Rodar novamente com o lote de ~100 chamados aprovados. Com o timeout defensivo, se algum batch ainda falhar, os logs vão mostrar exatamente qual — sem quebrar o preview inteiro.

## Detalhes técnicos

- Concorrência 5 é conservadora contra rate limit da OpenAI no `gpt-4o-mini` (tier padrão suporta bem) e mantém o tempo total do preview em ~10–20s para 100 chamados.
- O fallback pra categoria genérica quando um batch falha já existe (`const scored = new Map(...)` + `?? { category_id, score }`), só precisa ser acionado por erro/timeout também — hoje só é acionado se a IA responder JSON inválido.