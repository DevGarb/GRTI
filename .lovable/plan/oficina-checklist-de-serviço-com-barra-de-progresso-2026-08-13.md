# Oficina: checklist de serviço com barra de progresso

## Objetivo
Hoje o cartão só mostra a etapa do Kanban (ex. "Pintura"), o que esconde o real andamento do serviço. A ideia é ter um checklist de pontos-chave por OS e uma barra de % de conclusão visível no cartão.

## Checklist padrão (por OS)
Cada OS nasce com estes itens, na ordem:

1. Orçamento aprovado
2. Peças recebidas
3. Desmontagem
4. Desempeno / Chassi
5. Pintura
6. Pré-montagem
7. Montagem final
8. Revisão / Teste

O mecânico pode marcar/desmarcar cada item; também é possível adicionar ou remover itens em uma OS específica (casos fora do padrão).

## Onde aparece
- **Kanban admin (Oficina)**: barra fina de progresso no cartão + rótulo `5/8 · 63%`. Cor da barra segue a etapa atual do cartão.
- **Minhas OS (mecânico)**: bloco de checklist com caixas clicáveis dentro do cartão, mais a barra no topo.
- **Acompanhamento**: coluna/indicador de % por OS.
- **Modal de detalhe da OS**: checklist completo com quem marcou e quando.

## Regras
- % = itens concluídos / total de itens da OS.
- Marcar um item registra usuário e data/hora.
- Ao entregar a OS, o checklist é apenas exibido (somente leitura).
- Nada bloqueia mudança de etapa nem finalização: o checklist é informativo, não muda regra de negócio existente.

## Detalhes técnicos
- Nova tabela `op_service_order_checklist` (`id`, `organization_id`, `service_order_id`, `label`, `position`, `done`, `done_at`, `done_by`, `created_at`), com GRANTs para `authenticated`/`service_role`, RLS por organização no mesmo padrão das outras tabelas `op_*`.
- Itens padrão criados por trigger `AFTER INSERT` em `op_service_orders`; backfill dos itens para as OS ativas existentes na mesma migração.
- Lista de labels padrão centralizada em `src/lib/oficinaStages.ts` (`SERVICE_CHECKLIST`) para reaproveitar no frontend.
- Novo hook `useServiceChecklist` em `src/hooks/useOficina.ts`: carrega itens agrupados por `service_order_id` (uma query por org) e expõe `toggle`, `addItem`, `removeItem`.
- Novo componente `src/components/operacional/OsProgressBar.tsx` (barra + rótulo) e `OsChecklist.tsx` (lista marcável), usados em `OpOficina.tsx`, `OpOficinaMinhas.tsx` e `OpOficinaAcompanhamento.tsx`.
- Escopo restrito ao módulo Oficina; nenhuma alteração em outros módulos.

## Botão "Peças disponíveis" → ativa o prazo de entrega
- Novo botão no cartão da OS (Kanban admin e Minhas OS) e no modal de detalhe: **"Peças disponíveis"**, habilitado quando ainda não há `parts_arrived_at`.
- Ao clicar: registra a chegada das peças na data de hoje, ativa o campo de prazo de entrega e o preenche automaticamente com hoje + 10 dias.
- O prazo pode ser editado, mas nunca além de hoje + 10 dias (o seletor de data limita o máximo e valores maiores são rejeitados com aviso).
- Se a OS estiver em "Aguardando Peça", ela avança para "Em Execução" (comportamento já existente do fluxo de compras).
- No cartão passa a aparecer "Entrega até DD/MM/AAAA" com contagem de dias restantes; vermelho quando estourado (mantém o alerta atual).
- O item "Peças recebidas" do checklist é marcado automaticamente nesse clique.
- Técnico: usa as colunas já existentes `parts_arrived_at` e `deadline` de `op_service_orders` e a constante `SLA_PECAS` (10) de `src/lib/oficinaStages.ts` — sem mudanças de schema para essa parte.
