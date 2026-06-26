## Modal "ver mais" no Calendário de Chamados

Atualmente quando um dia tem mais de 4 chamados, aparece um texto "+N mais" estático em `src/pages/chamados/ChamadosCalendario.tsx`. Vou transformar isso em um botão que abre um modal listando todos os chamados daquele dia.

### Mudanças

**`src/pages/chamados/ChamadosCalendario.tsx`**
- Novo estado `dayModal: { date: Date; tickets: Ticket[] } | null`.
- Substituir o `<div>+N mais</div>` por um `<button>` que seta o `dayModal`.
- (Opcional) tornar o número do dia também clicável para abrir o modal quando houver chamados.
- Novo `<Dialog>` (shadcn) renderizado quando `dayModal` está aberto:
  - Título: "Chamados em DD/MM/YYYY" (formatado em pt-BR).
  - Lista vertical com todos os chamados do dia, cada item mostrando:
    - Título do chamado
    - `StatusBadge` + `PriorityBadge`
    - Técnico atribuído (se houver)
    - Pintado com a mesma cor de fundo já usada no calendário (`colorFor`).
  - Ao clicar em um item: fecha o modal do dia e seta `selectedTicket` → abre o `TicketDetailModal` já existente.

### Comportamento
- Sem mudanças de dados/queries — usa os mesmos `tickets` já carregados.
- Sem alterações de backend, RLS, métricas ou outras telas.
