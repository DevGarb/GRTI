# Plano — Fase 1: Seletor de Organização + Módulo Entregas

A entrega virá em **3 fases** (Entregas → Oficina → Manutenção Predial). Esta fase entrega o **fluxo de escolha de organização** + o **módulo Entregas completo** como nos prints.

---

## 1. Seletor de Organização pós-login

Hoje o usuário cai direto em `/`. Vamos adicionar uma tela intermediária quando ele tiver acesso a mais de uma organização.

- **Nova tabela `user_organizations`**: vincula um usuário a múltiplas organizações (hoje `profiles.organization_id` é único). A `organization_id` do `profiles` continua sendo a "organização ativa".
- **Nova rota `/escolher-organizacao`**: mostra dois (ou mais) cards grandes:
  - **Grupo Ramos** — Setor de T.I (helpdesk atual)
  - **OPERACIONAL** — Setor de Operações (entregas, oficina, manutenção)
  - Cada card com logo, nome e subtítulo; ao clicar, atualiza `profiles.organization_id` para a org escolhida e navega para `/`.
- **Fluxo de login**: após autenticar, se `user_organizations` tiver >1 vínculo → vai para `/escolher-organizacao`; senão segue normal.
- **Botão "Trocar organização"** no header/menu do usuário, visível para quem tem múltiplos vínculos.
- Usuários como o **Ocelo** ficam com vínculo a apenas 1 org (OPERACIONAL) + override de menu apenas para "Manutenção Predial".

## 2. Estrutura do módulo OPERACIONAL

Itens de menu novos (visíveis só quando a org ativa for OPERACIONAL):

- **Cadastros** (`/op/cadastros`) — abas Motoristas / Empresas / Veículos
- **Entregas** (`/op/entregas`) — foco desta fase
- **Oficina** (`/op/oficina`) — fase 2
- **Manutenção Predial** (`/op/manutencao`) — fase 3
- **Avaliações** já existe e pode ser reaproveitado

A sidebar atual continua igual quando a org ativa for Grupo Ramos.

## 3. Cadastros (híbrido)

- **Motoristas**: tabela nova `op_drivers` (nome, telefone, tipo de veículo padrão, ativo). Opcionalmente vinculados a um `user_id` se também forem usuários do sistema.
- **Empresas (clientes/solicitantes)**: tabela nova `op_companies` (nome, contato). Não reaproveitar `sectors` para evitar misturar conceitos.
- **Veículos**: tabela nova `op_vehicles` (placa, modelo, tipo: Moto/Carro, ativo).

## 4. Entregas (escopo desta fase, conforme print)

Tela `/op/entregas` com:

- Filtro por mês (dropdown), filtros rápidos: **Tudo / Hoje / Semana / Data**
- 4 KPIs: Total no Mês, Pendentes, Em Rota, Finalizados
- Tabs por motorista com contagem (Todos / Luis Gustavo / etc.) — geradas a partir de `op_drivers`
- Busca por destino/motorista/empresa + filtros (status, tipo, período do dia)
- Lista agrupada por data (dia da semana), cada card mostrando: empresa solicitante, status, tipo, motorista, veículo, período, endereço, contato/telefone, data, observações
- Botão **+ Nova Entrega** abre modal com: empresa, motorista, veículo, tipo (Entrega/Vistoria/...), período (Manhã/Tarde), data, endereço, associado, contato, observações
- Ações por linha: editar status (Pendente / Em rota / Finalizado), editar, excluir

### Schema `op_deliveries`

Campos: `organization_id`, `company_id`, `driver_id`, `vehicle_id`, `type` (Entrega/Vistoria/...), `period` (Manhã/Tarde), `scheduled_date`, `address`, `contact_name`, `contact_phone`, `notes`, `status` (Pendente/Em rota/Finalizado/Cancelado), `created_by`, timestamps.

## 5. Permissões

- **Sem nova role**: usuários comuns + overrides de menu via `user_menu_overrides` (já existe).
- Novas chaves de menu: `op-cadastros`, `op-entregas`, `op-oficina`, `op-manutencao`.
- Admin da org OPERACIONAL libera o que cada usuário enxerga.
- RLS em todas as tabelas novas: visível apenas para quem está na mesma organization (`is_same_organization`); insert/update por staff/admin da org.

## 6. Detalhes técnicos

- Migrações: `user_organizations`, `op_drivers`, `op_companies`, `op_vehicles`, `op_deliveries` + RLS + triggers `updated_at`.
- Inserir nas chaves de menu existentes os novos `menu_key`s e mapear ícones na sidebar.
- Hooks: `useUserOrganizations`, `useDrivers`, `useCompanies`, `useVehicles`, `useDeliveries`.
- Seed manual (você fará no super admin): vincular seu usuário às duas organizações via `user_organizations`.

## 7. Fora do escopo desta fase

- Oficina (OS, peças, fotos, PDF para fornecedor) → fase 2
- Manutenção Predial (sedes, checklist, histórico) → fase 3
- Acesso do **Ocelo** será criado na fase 3, junto com a Manutenção
