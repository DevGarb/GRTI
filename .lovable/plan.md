# Sugestão de Meta de Pontuação (IA)

Novo recurso na aba **Metas**: um botão "Sugestão de meta de pontuação" que abre um modal com a meta de pontos sugerida para **cada técnico** no mês vigente, calculada por IA (GPT-5.6 Sol) a partir da evolução dos últimos 6 meses. O modal tem "Fechar" e "Aprovar" — ao aprovar, as metas de `points` do mês vigente são gravadas para todos os técnicos listados.

## Como funciona

1. Ao abrir o modal, o app busca o histórico de pontuação dos últimos 6 meses de cada técnico (mesma fonte já usada na tela de Metas) e a meta de pontos atual, se existir.
2. Esse histórico é enviado para uma nova função de backend que chama o modelo `openai/gpt-5.6-sol`.
3. A IA devolve, por técnico: meta sugerida de pontos para o mês vigente, tendência (crescente / estável / queda) e uma justificativa curta em português — a sugestão é ancorada na média com ajuste pela evolução constante, sem inventar números.
4. O modal mostra uma tabela: técnico, os 6 meses de pontos, média, meta atual, meta sugerida (editável) e justificativa.
5. "Aprovar" grava/atualiza as metas `points` (individual, mês/ano vigente) de todos os técnicos da lista e atualiza a tela.

## Detalhes técnicos

- **Edge function nova** `suggest-points-goals`: recebe o payload já calculado no frontend, chama a Responses API via `_shared/openaiResponses.ts` (mesmo padrão de `generate-goals-analysis`) com `model: "openai/gpt-5.6-sol"` e saída em `json_schema` estrito (`{ suggestions: [{ user_id, suggested_points, trend, rationale }] }`). Trata 429/402/403 devolvendo mensagem clara.
- **Hook novo** `src/hooks/usePointsGoalSuggestion.ts`: faz 6 chamadas à RPC `get_metas_tecnicos` (um mês cada, em paralelo), monta a série histórica por técnico, invoca a edge function e expõe a mutação de aprovação (upsert em `performance_goals` com `metric = "points"`, `target_type = "individual"`, ano/mês vigentes).
- **Componente novo** `src/components/metas/PointsGoalSuggestionModal.tsx` com a tabela, valores editáveis e os botões Fechar / Aprovar.
- **Entrada**: botão no cabeçalho de `src/components/metas/GoalsManager.tsx`, ao lado das ações existentes (visível para admin/desenvolvedor, como as demais ações de gestão de metas).
- Sem mudança de schema: `performance_goals` já suporta a métrica `points`.

## Validação

- `bun run build`.
- Deploy da edge function e uma chamada real para confirmar retorno JSON válido.
