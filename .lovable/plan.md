## Substituir o calendário de chamados por grade mensal estilo Projetos

Trocar a visualização atual (`Calendar` shadcn + lista lateral) na rota `/chamados/calendario` por uma grade mensal igual à de `ProjetosCalendario`, com cards retangulares (um por linha) dentro de cada dia. Clicar em um card abre o `TicketDetailModal` existente.

### Mudanças

**`src/pages/chamados/ChamadosCalendario.tsx`** — reescrita:
- Manter o filtro de técnico (admin) e a query de tickets do mês (`due_date` entre `startOfMonth`/`endOfMonth`).
- Substituir o componente `<Calendar>` por uma grade `grid-cols-7` (Dom–Sáb) com `eachDayOfInterval(startOfWeek..endOfWeek)` do mês corrente.
- Cabeçalho: título "Calendário de Chamados", navegação de mês (◀ Mês YYYY ▶) à direita usando `ChevronLeft`/`ChevronRight` e `addMonths`.
- Legenda de cores compacta acima da grade:
  - verde = Fechado/Aprovado
  - vermelho = vencido (due_date < hoje e status aberto)
  - âmbar = Em Andamento
  - azul = Aberto/Disponível
- Cada célula de dia:
  - altura mínima `min-h-[110px]`, número do dia no topo (menor mês = `opacity-40`, hoje = `ring-2 ring-primary`).
  - lista vertical (`space-y-1`) de cards de chamado: retângulos largos e baixos (`w-full px-1.5 py-0.5 rounded border text-[10px] truncate`), cor pela função `colorFor(status, due_date)`, `title` com prioridade + técnico.
  - mostrar até 4 cards; se houver mais, "+N mais" como texto.
  - `onClick` abre `TicketDetailModal` com o ticket clicado (`stopPropagation` não necessário — célula não tem handler).
- Remover seleção de dia e lista lateral; remover drag/drop (não solicitado).
- Manter `ChamadosTabs` no topo.

### Detalhes técnicos
- Reutilizar a função `colorFor` adaptada para status de ticket (`Fechado`/`Aprovado` → verde; vencido → vermelho; `Em Andamento` → âmbar; default → azul).
- Estado: `cursor: Date`, `selectedTicket: Ticket | null`.
- Sem alterações de banco, hooks ou outros arquivos.
