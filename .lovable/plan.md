## Contexto

A tela `Chamados em Aberto` está exibindo chamados que já possuem técnico atribuído (ex.: FELIPE AUGUSTO, GABRIEL CAMINHA no print). Consulta ao banco:

- 34 chamados com status `Aberto`/`Disponível` no total
- Apenas **9** com `assigned_to IS NULL`
- A tela mostra 33 → o filtro de "sem técnico" não está sendo respeitado na prática

O arquivo `src/pages/ChamadosAbertos.tsx` já tem `.is("assigned_to", null)` na query, mas a UI continua listando chamados atribuídos (provavelmente por cache/HMR ou por atualização otimista que não revalida).

## Alteração

Arquivo único: `src/pages/ChamadosAbertos.tsx`

1. Manter o filtro no servidor (`.is("assigned_to", null)`).
2. Adicionar um filtro defensivo no client, dentro do `.filter(...)` que gera `filtered`, garantindo `!t.assigned_to`. Isso protege contra:
   - Atualizações realtime que injetem um ticket já atribuído
   - Cache do React Query com dados antigos
   - Qualquer regressão futura na query

3. Ajustar também o fallback do `openId` (busca direta por ID) para não abrir o modal se o ticket já tiver técnico — nesse caso, o usuário é redirecionado silenciosamente (o ticket "saiu" da fila).

## Detalhes técnicos

```ts
const filtered = tickets
  .filter(t => !t.assigned_to) // safety net
  .filter(t => /* busca textual atual */)
  .sort(/* atual */);
```

E no fallback:

```ts
if (data && !data.assigned_to) {
  setSelectedTicket(...);
}
```

Sem mudanças em hooks, RLS, banco ou outras telas. Comportamento de "Meus Chamados" e Dashboard não é afetado.

## Verificação

- Typecheck (`tsgo --noEmit`)
- Contagem na UI deve bater com `select count(*) from tickets where status in ('Aberto','Disponível') and assigned_to is null` (hoje = 9, escopado à organização do usuário)
