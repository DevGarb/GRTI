## Objetivo

Unificar tudo no `/dashboard`. A página decide o que renderizar com base na **org ativa** (`profile.organization_id`) e nos **roles da org** (`user_organization_roles`):

- **Grupo Ramos** → dashboard atual (chamados, CSAT, retrabalhos, técnicos) — sem alterações.
- **CGPS Operacional** → novo conjunto de KPIs vindo de OS / OM / Entregas / Checklists.
- Aposentar o `/op/dashboard` criado anteriormente (rota e item de menu removidos).
- Dados **estritamente** filtrados por `organization_id` da org ativa. Nenhuma query cruza orgs.

## O que o dashboard Operacional vai mostrar

### 1. Filtros (topo)
- **Seletor de mês** (igual ao Grupo Ramos).
- Chips de filtro por módulo: **Mecânico**, **Sede**, **Motorista** (cada um filtra apenas seu bloco; também afetam os KPIs macro quando aplicados).

### 2. KPIs macro (cards no topo, agregando OS + OM + Entregas do mês)
- Total de demandas
- Em aberto / Em andamento
- Concluídas (com % do total)
- Atrasadas (`deadline < hoje` e status não-final)
- Tempo médio de execução (dias entre `opened_at` e `finished_at` — só itens fechados)
- Cumprimento de prazo % (concluídas dentro do `deadline` ÷ concluídas)
- Custo total da Oficina no mês (soma `op_service_orders.total_cost`)
- Manutenções por sede (contagem distinta de sedes ativas)
- Entregas por motorista (média)

### 3. Bloco Oficina (OS)
- Status breakdown (Pendente / Aguardando peças / Em andamento / Finalizado) — barras
- **OS por mecânico** (ranking: total, finalizadas, atrasadas)
- **Custo total e médio por OS** no mês
- **Peças mais usadas** (top 10 via `op_service_order_parts` × `op_parts`, somando `quantity`)
- Lista de **OS atrasadas** (com link p/ módulo)

### 4. Bloco Manutenção (OM)
- Status breakdown
- **OM por sede** (`op_sites.name` × contagem)
- **OM por categoria** (Elétrica / Hidráulica / Civil / Outros) — pizza
- **OM por prioridade** (Baixa / Média / Alta / Crítica)
- Lista de **OM atrasadas**

### 5. Bloco Entregas
- Status breakdown (Pendente / Em rota / Finalizado / Cancelado)
- **Entregas por motorista** (ranking)
- **Por tipo** (Entrega / Vistoria / Retirada / Outro)
- **Por período** (Manhã / Tarde / Noite)
- Lista de **Entregas atrasadas** (`scheduled_date < hoje` e não finalizadas)

### 6. Bloco Checklists
- **Execuções por sede** no mês (de `op_checklist_executions`)
- **Execuções por template** (top templates utilizados)
- % de templates ativos com pelo menos 1 execução no mês

### 7. Volume diário (gráfico de barras empilhado)
- Eixo X: dias do mês selecionado
- Series: OS, OM, Entregas criadas naquele dia

## Aspectos técnicos

### Roteamento e menu
- Em `App.tsx`: remover rota `/op/dashboard`.
- Em `src/config/menuItems.ts`: remover entrada "Painel Operacional" (Dashboard normal já está no menu).
- Apagar `src/pages/OpDashboard.tsx`.

### Estrutura de `Dashboard.tsx`
Detectar org pelo slug via `organizations` (já carregado no AuthContext) ou pelo `profile.organization_id` + lookup:

```tsx
const isOperacional = currentOrgSlug === "cgps-operacional";
return isOperacional ? <DashboardOperacional /> : <DashboardPadrao />;
```

Mover o conteúdo atual para `src/pages/dashboard/DashboardPadrao.tsx` (sem mudanças funcionais — apenas split).
Criar `src/pages/dashboard/DashboardOperacional.tsx` com a estrutura acima.

### Hooks de dados
Criar `src/hooks/useOpDashboardMetrics.ts` retornando todos os agregados em um único `useQuery` parametrizado por `(orgId, monthStart, monthEnd, mechFilter, siteFilter, driverFilter)`. Reutiliza os hooks já existentes (`useServiceOrders`, `useMaintenanceOrders`, `useDeliveries`) apenas quando útil; agregados pesados (peças mais usadas, custo) ficam no hook novo, com queries diretas filtradas por `organization_id`.

### Isolamento entre orgs
- Todas as queries do hook novo passam `.eq("organization_id", orgId)` explicitamente — mesmo com RLS já cobrindo, garante intenção.
- Nenhum dado de `tickets` aparece no dashboard operacional; nenhum dado `op_*` aparece no dashboard padrão.
- Quando usuário muda de org ativa, o `Dashboard.tsx` re-renderiza (queryKey contém `orgId`).

### Permissões
- Página acessível para qualquer membro da org (já é hoje). O conteúdo (admin vs solicitante) não muda — todos veem os mesmos cards. Caso futuramente o cliente queira esconder métricas financeiras para solicitantes, abriremos um toggle por role.

## Fora de escopo (para conversas futuras)
- Comparativo mês a mês (tendência histórica).
- Metas operacionais (analógico ao `performance_goals` atual).
- Exportação CSV do painel operacional.
- Drill-down ao clicar nos números (abrir lista filtrada no módulo).

Se algum dos KPIs acima não fizer sentido ou estiver faltando, basta apontar e eu ajusto o plano antes de implementar.