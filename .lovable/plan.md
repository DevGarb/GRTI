## Objetivo
Tornar o popup de "Novo chamado aberto" clicável: ao clicar, navegar para `/chamados-abertos` e abrir automaticamente o modal de detalhes do chamado recém-criado.

## Mudanças

### 1. `src/hooks/useNewTicketNotifier.ts`
- No handler do Realtime, ao receber o INSERT, usar `toast(..., { action: { label: "Abrir", onClick: ... } })` **e** tornar a área do toast clicável navegando para `/chamados-abertos?open=<ticketId>`.
- Como o hook roda dentro do Router (em AppLayout), usar `useNavigate()` para a navegação SPA (sem reload).

### 2. `src/pages/ChamadosAbertos.tsx`
- Ler `searchParams.get("open")` com `useSearchParams`.
- Em um `useEffect` que dispara quando `tickets` carrega e há `open` na URL:
  - Procurar o ticket pelo id na lista carregada.
  - Se encontrado, setar `selectedTicket` para abrir o `TicketDetailModal`.
  - Se não encontrado (ex.: já foi atribuído e saiu da lista de "Aberto"), buscar diretamente via `supabase.from('tickets').select('*').eq('id', openId).maybeSingle()` e abrir mesmo assim.
  - Limpar o param da URL após abrir (`setSearchParams({})`) para não reabrir em refresh.

## Sem impacto em backend
Apenas frontend — nenhum cron, nenhuma edge function nova. Continua usando o canal Realtime já existente.