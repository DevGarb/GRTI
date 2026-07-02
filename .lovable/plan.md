## Problema

Entregas pendentes (não-finalizadas) de meses anteriores não aparecem quando o usuário navega para o mês atual/seguinte. Elas ficam "presas" no mês em que foram agendadas.

## Comportamento desejado

Ao visualizar um mês no seletor, mostrar:
- Todas as entregas agendadas **naquele mês**, mais
- Todas as entregas **de meses anteriores** que ainda não foram finalizadas nem canceladas (status ≠ "Finalizado" e ≠ "Cancelado").

Assim, uma entrega pendente de maio aparece em junho, julho etc. até ser finalizada/cancelada.

## Mudanças

Arquivo único: `src/pages/OpEntregas.tsx`

1. **Filtro `filtered` (linha 72)**: substituir
   ```
   if (!d.scheduled_date.startsWith(activeMonth)) return false;
   ```
   por uma regra que aceita:
   - `d.scheduled_date` dentro de `activeMonth`, **ou**
   - `d.scheduled_date` anterior ao 1º dia de `activeMonth` **e** status pendente (`!== "Finalizado"` e `!== "Cancelado"`).

2. **KPIs / `monthItems` (linha 91)**: aplicar a mesma regra, para que "Pendentes" e "Em Rota" do mês incluam os arrastados de meses passados. "Finalizados" continua estritamente do mês corrente (só finalizados naquele mês).

3. **Card do Kanban (`renderKanbanCard`)**: destacar visualmente quando `d.scheduled_date` está fora do `activeMonth` (ex.: badge "Atrasada" ou cor da data em âmbar/vermelho) para o usuário perceber que é um arrasto de mês anterior.

4. Filtros existentes (motorista, busca, status, tipo, hoje/semana/data) continuam se aplicando sobre esse conjunto expandido.

## Não muda

- Aba Lista / agrupamento por data continuam funcionando (as datas antigas simplesmente aparecerão como grupos separados no topo).
- Nenhuma alteração de banco de dados.
- Oficina e Manutenção Predial ficam de fora deste ajuste (podem receber o mesmo tratamento depois se você quiser).

## Verificação

- Criar/ter entrega "Pendente" em maio, navegar para junho → deve aparecer na coluna do motorista (ou em "Pendente" se sem motorista), com marcação de atraso.
- KPI "Pendentes" de junho deve incluir a de maio.
- Ao finalizar essa entrega em junho, ela some do mês seguinte.
