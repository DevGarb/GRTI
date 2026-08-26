# Trocar modelo das análises de IA para gpt-5.6-terra

Trocar o modelo de `gpt-4o-mini` para `openai/gpt-5.6-terra` nos três pontos de IA que rodam diretamente na API da OpenAI, migrando simultaneamente de `/v1/chat/completions` para a **Responses API** (`/v1/responses`), que é o endpoint correto para a família GPT-5.6.

## Pontos de mudança

1. `supabase/functions/close-approved-tickets-ai/index.ts`
2. `supabase/functions/generate-executive-summary/index.ts`
3. `supabase/functions/generate-goals-analysis/index.ts`

## O que muda em cada edge function

- **Modelo:** `"gpt-4o-mini"` → `"gpt-5.6-terra"`.
- **Endpoint:** `https://api.openai.com/v1/chat/completions` → `https://api.openai.com/v1/responses`.
- **Corpo da requisição:**
  - Substituir `messages` por `input` (array com `role` e `content`).
  - Substituir `response_format` por `text.format: { type: "json_object" }`.
  - Capar saída com `max_output_tokens` (ao invés de `max_tokens`/`max_completion_tokens`).
  - Remover `temperature` (modelos GPT-5 rejeitam valores não-padrão).
- **Parsing da resposta:** ler de `output[0].content[0].text` (formato da Responses API), mantendo fallback seguro para evitar crashes.
- Nenhuma alteração de negócio, prompts, rubrica ou lógica de cache — apenas a camada de chamada ao modelo.

## Validação

1. `bun run build` para garantir que o frontend/TypeScript não quebrou.
2. Deploy das três edge functions via `supabase--deploy_edge_functions`.
3. (Opcional) Testar uma chamada real de cada função para confirmar retorno JSON válido e ausência de erros 400.
