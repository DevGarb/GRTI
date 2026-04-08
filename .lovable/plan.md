

# Plano: Remover seção "Chamados em Aberto" da página Chamados

## Resumo
A seção de chamados em aberto dentro da página `/chamados` é redundante com a página dedicada `/chamados-abertos`. Vamos removê-la.

## Mudanças em `src/pages/Chamados.tsx`

1. **Remover a seção "Chamados em Aberto"** (linhas 316-323) — o bloco que renderiza `AvailableTicketsSection` com `variant="open"` e título "Chamados em Aberto"

2. **Remover a variável `openTickets`** (linha 311) — `const openTickets = filtered.filter(t => t.status === "Aberto" && t.assigned_to !== userId)`

3. **Remover o componente `AvailableTicketsSection`** por completo (linhas 74-122) caso a seção de "Disponíveis para assumir" (SLA expirado) também seja considerada redundante. Se quiser manter a seção de SLA expirado na página de chamados, mantemos o componente e removemos apenas o bloco "open".

4. **Limpar imports** não utilizados (`Clock` se não for mais usado)

