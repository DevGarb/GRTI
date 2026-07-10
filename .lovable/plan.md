
# Nova Organização: Checklists Operacionais

Cria uma terceira organização (slug `checklists`) com um painel dedicado — separado do GRTI e do Operacional — para gestores criarem modelos de checklist por setor, atribuírem a empresas/colaboradores e acompanharem execuções com score ponderado.

## 1. Modelo de dados (novas tabelas, prefixo `chk_`)

```text
chk_sectors           setores da org (ex.: Limpeza, Segurança, Manutenção)
chk_companies         empresas parceiras vinculadas a 1 setor
chk_templates         modelo de checklist (título, setor, frequência, ativo)
chk_template_items    itens do modelo (título, observação padrão, peso 1/2/3, ordem, exige_foto)
chk_assignments       atribuição do modelo → empresa + colaborador + recorrência
chk_executions        instância a ser preenchida (assignment, data alvo, status, score)
chk_execution_items   resposta por item (feito/não feito, observação, foto_url)
```

Campos-chave:
- `chk_templates.frequency`: `unica | diaria | semanal | mensal`
- `chk_template_items.weight`: `smallint check (1..3)`
- `chk_executions.status`: `pendente | em_andamento | concluida | atrasada`
- `chk_execution_items.photo_path`: bucket `checklist-photos` (privado, RLS por org)
- Todas com `organization_id` + `created_at/updated_at`

Recorrência: um job cron diário gera novas `chk_executions` a partir dos `chk_assignments` recorrentes e marca as vencidas como `atrasada`.

## 2. Papéis e permissões

Reaproveita roles existentes na org `checklists`:
- **admin** → Gestor: CRUD de setores, empresas, modelos, atribuições; vê relatórios de todos.
- **solicitante** → Colaborador: vê apenas `chk_executions` onde `assigned_user_id = auth.uid()`; pode preencher itens e enviar fotos; sem acesso a relatórios.

RLS:
- Leitura: `is_same_organization(organization_id)` + filtro por `assigned_user_id` para colaborador.
- Escrita em modelos/atribuições: apenas `has_role_in_org(auth.uid(),'admin',org)`.
- Escrita em respostas: apenas o próprio colaborador atribuído, enquanto execução não estiver `concluida`.

Trigger `handle_new_user` **não** vincula automaticamente à org de checklists (diferente de GRTI/Operacional) — vínculo é manual pelo gestor.

## 3. Painel dedicado (frontend)

Detectar a org ativa por slug `checklists` e trocar o layout:

Rotas novas sob `/checklists/*`:
- `/checklists` → Dashboard do gestor (KPIs + últimas execuções)
- `/checklists/setores` → CRUD de setores
- `/checklists/empresas` → CRUD de empresas (vinculadas a setor)
- `/checklists/modelos` → CRUD de modelos + itens (com peso e exige_foto)
- `/checklists/atribuicoes` → Atribuir modelo → empresa + colaborador + recorrência
- `/checklists/execucoes` → Fila de execuções (filtros por status/empresa/colaborador)
- `/checklists/relatorios` → Relatório do gestor (ver seção 4)
- `/checklists/minhas` → Visão do colaborador (só suas execuções pendentes/em andamento)
- `/checklists/executar/:id` → Tela de preenchimento (itens com foto, observação, marcar feito)

Menu lateral (via `menuItems.ts` + `orgSlugs: ['checklists']`) esconde tudo do GRTI/Operacional e mostra só os itens acima. `EscolherOrganizacao.tsx` ganha o card da nova org com descrição "Checklists e Auditoria".

## 4. Relatório do gestor (MVP)

Uma página `/checklists/relatorios` com filtros (período, setor, empresa, colaborador) exibindo:

- **% de conclusão** por checklist, colaborador e empresa (barras + tabela)
- **Score ponderado** por execução: `Σ(peso dos itens feitos) / Σ(peso total) * 100`
- **Itens pendentes/atrasados** com destaque visual (badge vermelho, ordenados por peso desc)
- **Galeria de fotos** anexadas (grid clicável para lightbox)
- **Exportação CSV** (UTF-8 BOM, `;`) com colunas: data, empresa, colaborador, checklist, itens_feitos, itens_total, score_ponderado, status

Dados via função SQL `get_checklists_report(_org, _from, _to, _filters jsonb)` retornando jsonb agregado — evita queries N+1 no client.

## 5. Storage

Bucket privado `checklist-photos`, path `<org_id>/<execution_id>/<item_id>-<uuid>.jpg`. Signed URLs via helper existente em `src/lib/attachments.ts`.

## 6. Cron

Novo job (via `supabase--insert`, não migration):
- `checklist-generate-recurring` — a cada 6h, roda função `generate_recurring_executions()` que cria as próximas execuções e marca as vencidas como `atrasada`.

## 7. Entregáveis por fase

**Fase 1 — Backend (1 migration):**
- Cria as 7 tabelas com GRANTs + RLS + triggers `updated_at`
- Funções: `generate_recurring_executions()`, `get_checklists_report(...)`
- Bucket `checklist-photos` + policies
- Insere organização `checklists` (via insert tool)

**Fase 2 — Frontend estrutural:**
- Cria hooks `useChkTemplates`, `useChkAssignments`, `useChkExecutions`, `useChkReport`
- Registra rotas em `App.tsx` e itens em `menuItems.ts` com `orgSlugs`
- Adiciona card no `EscolherOrganizacao.tsx`

**Fase 3 — Telas do gestor:** CRUDs de setores, empresas, modelos, atribuições

**Fase 4 — Telas do colaborador:** `Minhas execuções` + `Executar checklist` (foto, observação, marcar)

**Fase 5 — Relatório + Dashboard + Cron de recorrência**

## 8. O que NÃO entra no MVP

- App mobile nativo (usa PWA responsivo existente)
- Assinatura digital / geolocalização no preenchimento
- Notificações push (só in-app via `notifications` existente)
- Aprovação/workflow multi-etapa de execuções

## Verificação final

- `tsgo --noEmit`, testes unitários existentes
- Playwright: login como gestor cria modelo → atribui a colaborador → login como colaborador preenche → gestor vê no relatório
- RLS: colaborador não consegue ler execuções de outros; usuários de outras orgs não veem nada
