## Ajuste de cores no Calendário de Chamados

Atualizar a função `colorFor` em `src/pages/chamados/ChamadosCalendario.tsx` para refletir a semântica: vermelho = pendência do técnico; verde = entregue.

### Nova lógica de cor (em ordem de precedência)

1. **Fechado / Aprovado** → verde (entregue, mesmo se passou do prazo — não é mais pendência).
2. **Retrabalho** (`reworkCount > 0` e ainda não fechado) → vermelho.
3. **Aberto / Em Andamento vencido** (`due_date < hoje`) → vermelho.
4. **Em Andamento** no prazo → âmbar.
5. **Aberto** no prazo → azul.

### Mudanças

**`src/pages/chamados/ChamadosCalendario.tsx`**
- `colorFor(status, dueDate, reworkCount)` recebe novo parâmetro.
- Reordenar verificações: fechado/aprovado sai antes do check de atraso.
- Incluir vermelho para chamados com retrabalho ativo.
- Atualizar chamadas (`colorFor(t.status, t.due_date, t.reworkCount)`) nos cards do grid e no modal "ver mais".
- Atualizar a legenda no topo: trocar "Vencido" por "Aberto/Andamento vencido ou Retrabalho".

**Carregamento do `reworkCount`**
- A query `tickets-calendar` atualmente não traz `reworkCount`. Adicionar um fetch leve em `ticket_history` (action=`rework`) para os IDs do mês, agrupar e mesclar — mesmo padrão usado em `useTickets.ts`.

### Fora de escopo
- `StatusBadge` continua igual (usado em outras telas).
- Sem alterações de backend ou em outras visualizações de chamados.
