# 📋 In Demands - Documentação Técnica

## Visão Geral

Sistema de gestão de chamados técnicos (helpdesk) com suporte a multi-tenancy, white-label, preventivas programadas, patrimônio, metas de desempenho e integrações via webhook e WhatsApp.

---

## 🏗️ Arquitetura

### Stack Tecnológica
- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS + shadcn/ui
- **Estado**: TanStack Query (React Query)
- **Roteamento**: React Router DOM v6
- **Backend**: Lovable Cloud (Supabase)
- **Banco de Dados**: PostgreSQL
- **Autenticação**: Supabase Auth
- **Funções Serverless**: Edge Functions (Deno)

### Estrutura de Pastas
```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── preventivas/    # Componentes de preventivas
│   ├── metas/          # Componentes de metas/goals
│   ├── ticket-detail/  # Detalhes do chamado
│   └── usuarios/       # Importação de usuários
├── contexts/           # Contextos React (AuthContext)
├── hooks/              # Hooks customizados
├── integrations/       # Integrações (Supabase client/types)
├── pages/              # Páginas da aplicação
├── data/               # Dados mock (desenvolvimento)
└── lib/                # Utilitários
```

---

## 👥 Sistema de Autenticação e Permissões

### Roles (Perfis de Usuário)

| Role | Descrição | Permissões |
|------|-----------|------------|
| `super_admin` | Super Administrador | Acesso total, gerencia organizações e planos |
| `admin` | Administrador | Gerencia usuários, categorias, configurações da org |
| `tecnico` | Técnico | Atende chamados, registra preventivas, cadastra patrimônio |
| `solicitante` | Solicitante | Abre e acompanha seus próprios chamados |

### Tabelas de Auth
- **profiles**: Dados do perfil (nome, email, telefone, avatar, organization_id)
- **user_roles**: Associação usuário ↔ role (múltiplas roles possíveis)

### Funções de Segurança (RLS)
```sql
has_role(_user_id uuid, _role app_role) → boolean
is_super_admin(_user_id uuid) → boolean
```

### Proteções
- Super admin não pode ter role removida (`protect_super_admin_role` trigger)
- Perfil de super admin não pode ser deletado (`protect_super_admin_profile` trigger)

---

## 🎫 Sistema de Chamados (Tickets)

### Estrutura do Ticket

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| title | text | Título do chamado |
| description | text | Descrição detalhada |
| priority | text | Urgente, Alta, Média, Baixa |
| type | text | Software, Hardware |
| status | text | Aberto, Em Andamento, Aguardando Aprovação, Aprovado, Fechado |
| assigned_to | uuid | Técnico responsável |
| created_by | uuid | Solicitante |
| category_id | uuid | Categoria do chamado |
| sector | text | Setor |
| organization_id | uuid | Organização (multi-tenant) |

### Fluxo de Status
```
Aberto → Em Andamento → Aguardando Aprovação → Aprovado → Fechado
                                    ↓ (reprovação)
                                  Aberto (retrabalho)
```

- **Retrabalho**: Reprovação exige motivo registrado no histórico; contador visual (ex: 2x) exibido na listagem e detalhes
- **Filtro de retrabalhos**: Filtro dedicado para identificar chamados com retrabalho

### Anexos
- Tabela `ticket_attachments` para arquivos
- Storage bucket `attachments` (público)

### Comentários
- Tabela `ticket_comments` com suporte a comentários públicos e privados

### Histórico
- Tabela `ticket_history` registra todas as mudanças de status e ações

### Avaliações
- Tabela `evaluations` para feedback pós-atendimento
- Score de 1-5 + comentário opcional

---

## 🏢 Multi-Tenancy (Organizações)

### Estrutura
| Campo | Descrição |
|-------|-----------|
| name | Nome da empresa |
| slug | Identificador único na URL |
| plan_id | Plano de assinatura |
| logo_url | Logo customizado |
| favicon_url | Favicon customizado |
| primary_color | Cor primária (white-label) |
| secondary_color | Cor secundária (white-label) |

### Isolamento de Dados
- Usuários vinculados via `profiles.organization_id`
- Tickets, categorias, preventivas, patrimônio filtrados por organização
- RLS garante isolamento automático

---

## 💳 Planos de Assinatura

### Estrutura (`subscription_plans`)
| Campo | Descrição |
|-------|-----------|
| name | Nome do plano |
| description | Descrição |
| price_monthly | Preço mensal |
| max_users | Limite de usuários |
| max_tickets_month | Limite de chamados/mês |
| is_active | Plano ativo/inativo |

---

## 🔧 Manutenção Preventiva

### Intervalos (`maintenance_intervals`)
Define periodicidade por tipo de equipamento:
```
equipment_type: "Computador" → interval_days: 90
```

### Registros (`preventive_maintenance`)
| Campo | Descrição |
|-------|-----------|
| equipment_type | Tipo do equipamento |
| asset_tag | Patrimônio |
| sector | Setor |
| responsible | Responsável |
| execution_date | Data de execução |
| checklist | JSON com itens verificados |
| notes | Observações |
| created_by | Técnico responsável |

---

## 🏷️ Patrimônio

### Estrutura (`patrimonio`)
| Campo | Descrição |
|-------|-----------|
| asset_tag | Número do patrimônio |
| equipment_type | Tipo do equipamento |
| brand | Marca |
| model | Modelo |
| serial_number | Número de série |
| sector | Setor |
| responsible | Responsável |
| location | Localização |
| status | Ativo / Inativo / Manutenção |
| notes | Observações |

### Funcionalidades
- CRUD completo (admin e técnico)
- Importação em lote via CSV/planilha
- Edição inline com modal
- Filtro por status, tipo e setor

---

## 📊 Categorias

### Estrutura Hierárquica (3 níveis)
- **Macro**: Categorias principais (ex: Infraestrutura)
- **Sistema**: Subcategorias (ex: Rede)
- **Item**: Itens específicos pontuáveis (ex: Troca de patch cord)

### Pontuação
Cada item pode ter um `score` associado, usado nas metas de desempenho.

---

## 🎯 Metas de Desempenho

### Estrutura (`performance_goals`)
| Campo | Descrição |
|-------|-----------|
| metric | Métrica avaliada |
| target_type | individual / equipe |
| target_id | ID do alvo (técnico ou equipe) |
| target_label | Nome do alvo |
| target_value | Valor da meta |
| period | monthly / yearly |
| reference_year | Ano de referência |
| reference_month | Mês de referência (mensal) |

---

## 🏗️ Setores

### Estrutura (`sectors`)
| Campo | Descrição |
|-------|-----------|
| name | Nome do setor |
| is_active | Ativo/inativo |
| organization_id | Organização |

---

## 🪝 Webhooks

### Configuração (`organization_webhooks`)
| Campo | Descrição |
|-------|-----------|
| name | Nome do webhook |
| url | URL de destino |
| events | Eventos assinados (JSON) |
| secret | Chave secreta (opcional) |
| is_active | Ativo/inativo |

### Logs (`webhook_logs`)
| Campo | Descrição |
|-------|-----------|
| event_type | Tipo do evento |
| ticket_id | Chamado relacionado |
| ticket_title | Título do chamado |
| technician_name | Nome do técnico |
| status_code | Código HTTP de resposta |
| response | Corpo da resposta (JSON) |

### Filtros de Logs
- Filtro por tipo de evento (ticket.assigned, ticket.resolved, webhook_test)
- Filtro por status (sucesso/erro)
- Contador de resultados filtrados

### Teste Individual
- Botão "Testar" para cada webhook cadastrado
- Envia payload de exemplo com dados mock
- Resultado registrado em webhook_logs

### Eventos Suportados
1. **ticket.assigned**: Técnico atribuído ao chamado
2. **ticket.resolved**: Chamado resolvido (notifica solicitante)
3. **webhook_test**: Teste manual do webhook

---

## 📱 Integrações WhatsApp (UAZAPI)

### Configuração (`organization_integrations`)
| Campo | Descrição |
|-------|-----------|
| integration_type | Tipo (uazapi) |
| api_url | URL da API |
| api_token | Token de autenticação |
| instance_id | ID da instância |
| is_active | Ativo/inativo |
| notify_on_assign | Notificar atribuição |
| notify_on_resolve | Notificar resolução |

---

## 🔐 Edge Functions

### create-user
Criação de usuários por admins (sem confirmação de email).
- **Endpoint**: `POST /functions/v1/create-user`
- **Validações**: Apenas admins/super_admins; email e senha obrigatórios

### delete-user
Exclusão de usuários por admins.
- **Endpoint**: `POST /functions/v1/delete-user`

### dispatch-webhook
Disparo automático de webhooks para URLs cadastradas.
- **Endpoint**: `POST /functions/v1/dispatch-webhook`
- **JWT**: Não requerido

### test-webhook
Teste individual de webhook com payload de exemplo.
- **Endpoint**: `POST /functions/v1/test-webhook`
- **Body**: `{ "webhook_id": "uuid" }`
- **JWT**: Não requerido

### send-whatsapp
Envio de notificações WhatsApp via UAZAPI.
- **Endpoint**: `POST /functions/v1/send-whatsapp`
- **JWT**: Não requerido

---

## 📱 Páginas da Aplicação

| Rota | Página | Descrição |
|------|--------|-----------|
| `/` | Dashboard | Visão geral com métricas e gráficos |
| `/login` | Login | Autenticação |
| `/chamados` | Chamados | Lista e gestão de tickets |
| `/usuarios` | Usuários | Gestão de usuários (admin) |
| `/categorias` | Categorias | Gestão de categorias (admin) |
| `/setores` | Setores | Gestão de setores (admin) |
| `/preventivas` | Preventivas | Manutenções preventivas |
| `/patrimonio` | Patrimônio | Gestão de patrimônio |
| `/projetos` | Projetos | Gestão de projetos |
| `/avaliacoes` | Avaliações | Feedbacks dos chamados |
| `/metas` | Metas Técnicos | Métricas de desempenho |
| `/historico` | Histórico | Logs de auditoria |
| `/integracoes` | Integrações | Webhooks e WhatsApp |
| `/webhook-logs` | Webhook Logs | Logs de integrações com filtros |
| `/configuracoes` | Configurações | Configurações gerais |
| `/white-label` | White Label | Personalização da org |
| `/planos` | Planos | Gestão de planos (super_admin) |
| `/documentacao` | Documentação | Guias por perfil (Admin, Técnico, Solicitante) |
| `/migracao` | Migração | Painel de migração (super_admin) |
| `/super-admin` | Super Admin | Painel exclusivo super_admin |

---

## 🗄️ Esquema do Banco de Dados

### Diagrama de Relacionamentos
```
auth.users
    │
    ├── profiles (1:1)
    │       └── organization_id → organizations
    │
    └── user_roles (1:N)

organizations
    ├── plan_id → subscription_plans
    ├── organization_webhooks (1:N)
    └── organization_integrations (1:N)

tickets
    ├── created_by → profiles.user_id
    ├── assigned_to → profiles.user_id
    ├── category_id → categories
    ├── organization_id → organizations
    ├── ticket_attachments (1:N)
    ├── ticket_comments (1:N)
    ├── ticket_history (1:N)
    ├── evaluations (1:N)
    └── webhook_logs (1:N)

categories
    └── parent_id → categories (self-reference)

patrimonio
    ├── created_by → profiles.user_id
    └── organization_id → organizations

preventive_maintenance
    ├── created_by → profiles.user_id
    └── organization_id → organizations

performance_goals
    └── organization_id → organizations

sectors
    └── organization_id → organizations

audit_logs (standalone)
```

---

## 🔒 Row Level Security (RLS)

### Políticas Principais

**tickets**: SELECT (criador, técnico, admins) | INSERT (próprio) | UPDATE (criador, técnico, admins) | DELETE (admins)

**profiles**: SELECT (todos auth) | INSERT (próprio) | UPDATE (próprio ou admins)

**organizations**: SELECT (todos auth) | INSERT/UPDATE (admins) | DELETE (super_admin)

**patrimonio**: SELECT (todos auth) | INSERT/UPDATE (técnicos, admins) | DELETE (admins)

**webhook_logs**: SELECT (admins) | INSERT/UPDATE/DELETE (bloqueado — apenas edge functions)

**categories**: SELECT (todos auth) | INSERT/UPDATE/DELETE (admins)

**sectors**: SELECT (todos auth) | INSERT/UPDATE/DELETE (admins)

**performance_goals**: SELECT (todos auth) | ALL (admins)

---

## 🚀 Deploy e Ambiente

### Variáveis de Ambiente
```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
VITE_SUPABASE_PROJECT_ID=[project-id]
```

### Secrets (Edge Functions)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `LOVABLE_API_KEY`

---

## 📝 Triggers Automáticos

### handle_new_user
1. Cria registro em `profiles` com dados do usuário
2. Atribui role padrão `solicitante`

### update_updated_at_column
Atualiza `updated_at` automaticamente em tabelas que possuem esse campo.

### protect_super_admin_role / protect_super_admin_profile
Impede remoção de roles e perfis de super_admin.

---

## ✅ Funcionalidades Implementadas

1. **Sistema de Chamados** — CRUD completo com fluxo de status, retrabalho, prioridades e filtros
2. **Multi-Tenancy** — Isolamento por organização com RLS
3. **White-Label** — Personalização de cores, logo e favicon por organização
4. **Patrimônio** — Cadastro, importação em lote e gestão de ativos
5. **Preventivas** — Manutenções programadas com checklist e alertas de atraso
6. **Metas de Desempenho** — Métricas individuais e de equipe por período
7. **Categorias Hierárquicas** — 3 níveis (Macro/Sistema/Item) com pontuação
8. **Setores** — Gestão de setores por organização
9. **Webhooks** — Cadastro, teste individual e logs com filtros por evento/status
10. **WhatsApp (UAZAPI)** — Notificações configuráveis por organização
11. **Avaliações** — Feedback pós-atendimento com score
12. **Documentação Integrada** — Guias por perfil com busca (Admin, Técnico, Solicitante)
13. **Histórico/Auditoria** — Logs de ações do sistema
14. **Projetos** — Gestão básica de projetos
15. **Dashboard** — Métricas, gráficos e abas (Meus, Técnicos, Todos, Categorias)
16. **Importação de Usuários** — Cadastro em lote

---

*Última atualização: Março 2026*
