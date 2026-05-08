# 🏢 Guia de Organizações — Multi-Tenant

Este guia descreve como o sistema funciona em ambiente **multi-organização** (multi-tenant) e detalha as alterações recentes relacionadas a login, troca de organização, auditoria e o módulo Operacional.

## Índice
1. [Conceito de Organizações](#1-conceito-de-organizações)
2. [Login e Formato de Usuário](#2-login-e-formato-de-usuário)
3. [Tela "Escolher Organização"](#3-tela-escolher-organização)
4. [Troca de Organização](#4-troca-de-organização)
5. [Visibilidade de Menus por Organização](#5-visibilidade-de-menus-por-organização)
6. [Módulo Operacional (CGPS Operacional)](#6-módulo-operacional-cgps-operacional)
7. [Auditoria Multi-Tenant](#7-auditoria-multi-tenant)
8. [Webhooks e Integrações por Organização](#8-webhooks-e-integrações-por-organização)
9. [Isolamento de Dados (RLS)](#9-isolamento-de-dados-rls)

---

## 1. Conceito de Organizações

O sistema suporta **múltiplas organizações (tenants)** no mesmo ambiente. Cada organização possui:

- **Slug único** (ex.: `grupo-ramos`, `cgps-operacional`)
- Identidade visual própria (logo, cores, favicon — *White Label*)
- Conjunto isolado de dados: chamados, usuários, patrimônio, categorias, setores, integrações, webhooks
- Plano associado e configurações específicas

Atualmente o ambiente possui duas organizações principais:
- **Grupo Ramos** (`grupo-ramos`) — operação do **GRTI Helpdesk** (chamados, preventivas, ativos, projetos)
- **CGPS Operacional** (`cgps-operacional`) — operação **logística e oficina** (entregas, manutenção, oficina/OS)

Um usuário pode pertencer a **uma ou mais** organizações.

---

## 2. Login e Formato de Usuário

### Formato padrão
O login de cada usuário segue o padrão **`NOME.SOBRENOME`** (ex.: `BRUNA.JOPLIN`), gerado automaticamente no momento do cadastro a partir do nome completo.

### Fluxo de login
1. Usuário informa **login** (`NOME.SOBRENOME`) e **senha**
2. O sistema autentica e identifica as organizações vinculadas àquele usuário
3. O usuário é direcionado para a tela **Escolher Organização**

### Cadastro de novos usuários
Ao criar um novo usuário, o sistema:
- Gera o login no formato `NOME.SOBRENOME` automaticamente
- Cria o `profile` correspondente
- Atribui automaticamente a função inicial (role)
- **Vincula o usuário a ambas as organizações principais** (`grupo-ramos` e `cgps-operacional`) por meio da tabela `user_organizations`

> Os administradores podem revogar ou conceder vínculos manualmente via banco/Cadastros se for necessário restringir o acesso a apenas uma das organizações.

---

## 3. Tela "Escolher Organização"

Após o login, **todos os usuários** passam pela tela `/escolher-organizacao`.

- Lista todas as organizações às quais o usuário pertence
- Cada cartão exibe **logo**, **nome** e **slug**
- Ao clicar, o usuário define a organização **ativa** da sessão e segue para a área correspondente

Mesmo que o usuário tenha vínculo com apenas uma organização, a tela é exibida para reforçar o contexto de operação.

---

## 4. Troca de Organização

A troca pode ser feita a qualquer momento sem precisar deslogar:

- Pelo **OrgSwitcher** (canto superior do layout)
- Voltando manualmente para `/escolher-organizacao`

Ao trocar:
1. O campo `organization_id` do `profile` do usuário é atualizado
2. As consultas passam a respeitar o novo contexto via RLS (`is_same_organization`)
3. O menu lateral é recalculado conforme a organização escolhida (ver seção 5)
4. Um registro é gravado em **`audit_logs`** com `action = "switch_organization"` (ver seção 7)

---

## 5. Visibilidade de Menus por Organização

Cada item de menu pode declarar `orgSlugs` em `src/config/menuItems.ts`. O `useMenuAccess` cruza a organização ativa com essa lista para decidir o que exibir.

| Organização | Menus visíveis (alto nível) |
|-------------|------------------------------|
| `grupo-ramos` | Dashboard, Chamados, Chamados em Aberto, Preventivas, Patrimônio, Projetos, Categorias, Setores, Avaliações, Metas, Auditoria, Histórico, Webhook Logs, Integrações, Usuários, White Label, Configurações |
| `cgps-operacional` | Dashboard Operacional, Entregas, Oficina (OS), Manutenção, Cadastros Operacionais, Usuários, Configurações |

> Super Admin enxerga todos os menus, independentemente da organização ativa.

Ajustes finos por usuário continuam disponíveis na tabela `user_menu_overrides`.

---

## 6. Módulo Operacional (CGPS Operacional)

Quando o usuário escolhe `cgps-operacional`, ele acessa um módulo dedicado a operações logísticas e de manutenção:

- **Entregas** (`op_deliveries`) — agenda de entregas/coletas, motoristas, veículos, períodos (Manhã/Tarde), status (Pendente, Em rota, Concluída, Cancelada)
- **Oficina / Ordens de Serviço** (`op_service_orders`, `op_service_order_parts`, `op_service_order_photos`) — OS com mecânico responsável, peças, fotos antes/depois, custo total e status
- **Manutenção** (`op_maintenance_orders`, `op_maintenance_photos`) — Ordens de Manutenção (OM) com prioridade, prazo, responsável, fotos e site/local
- **Checklists** (`op_checklist_templates`, `op_checklist_items`, `op_checklist_executions`) — modelos de checklist por site e execuções diárias
- **Cadastros**:
  - Sites/locais (`op_sites`)
  - Empresas parceiras (`op_companies`)
  - Motoristas (`op_drivers`) e veículos (`op_vehicles`)
  - Mecânicos (`op_mechanics`)
  - Peças (`op_parts`)

Todas as tabelas operacionais possuem `organization_id` obrigatório e RLS que restringe o acesso a usuários da mesma organização (com permissão de admin ou técnico para escrita).

---

## 7. Auditoria Multi-Tenant

A tabela `audit_logs` agora possui a coluna **`organization_id`**, preenchida automaticamente por trigger a partir do `profile` do autor da ação.

### Eventos atualmente registrados
- `switch_organization` — toda vez que um usuário troca de organização (com `previous_organization_id`, `new_organization_id`, `new_organization_slug`, `source`)
- Demais eventos do sistema (criação, atualização e exclusão de chamados, alterações em patrimônio, etc.)

### Visibilidade dos logs
- **Super Admin / Auditor** — visualizam todos os logs
- **Admin** — visualiza apenas logs da própria organização (ou logs sem `organization_id`)
- **Técnico / Solicitante** — não acessam a tela de Auditoria

### Exportação
A página **Auditoria** continua exportando em CSV (UTF-8 com BOM, separador `;`) respeitando a organização ativa.

---

## 8. Webhooks e Integrações por Organização

- `organization_webhooks`: cada organização configura seus próprios webhooks (URL, segredo, eventos). RLS garante que apenas admins da mesma organização visualizem/alterem.
- `organization_integrations`: credenciais por organização (ex.: WhatsApp UaZAPI — `api_url`, `api_token`, `instance_id`, flags `notify_on_assign`, `notify_on_resolve`).

A edge function `dispatch-webhook` filtra automaticamente os webhooks pela organização do evento, e `send-whatsapp` usa as credenciais da organização do chamado.

Logs de webhook (`webhook_logs`) também são segmentados por `organization_id` e mantidos por **14 dias** pela rotina `cleanup-logs-daily` (03:00).

---

## 9. Isolamento de Dados (RLS)

Todas as tabelas com `organization_id` aplicam políticas RLS baseadas em duas funções `SECURITY DEFINER`:

- `is_super_admin(uid)` — bypass total
- `is_same_organization(org_id)` — confere se a organização do registro bate com a `organization_id` do `profile` do usuário autenticado

Padrões comuns:
- **SELECT**: `is_super_admin(auth.uid()) OR is_same_organization(organization_id)`
- **INSERT/UPDATE/DELETE**: além do isolamento, exige role (`admin`/`tecnico`) ou autoria do registro
- Triggers preenchem `organization_id` automaticamente em tabelas como `audit_logs`, evitando inconsistências quando o cliente esquece de informar

Isso garante que **uma organização nunca enxerga dados de outra**, mesmo que um bug do cliente tente buscar registros sem filtrar.

---

## Resumo das alterações recentes

- Login padronizado em `NOME.SOBRENOME`
- Tela `/escolher-organizacao` exibida sempre, para todos os usuários
- Trigger `handle_new_user` vincula novos usuários a `grupo-ramos` **e** `cgps-operacional`
- Backfill executado para vincular todos os usuários existentes às duas organizações
- `audit_logs.organization_id` adicionado, com trigger automático e RLS por organização
- Evento `switch_organization` registrado em toda troca de contexto
- Módulo **CGPS Operacional** completo (Entregas, Oficina, Manutenção, Checklists, Cadastros)
- Cron `cleanup-logs-daily` (03:00) — retenção de 2 dias para logs internos e 14 dias para webhook_logs; o antigo `check-sla` foi removido
