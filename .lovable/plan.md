# Criar organização GRCHECK para o módulo de Checklists

Entendi o erro: o módulo de checklists foi acoplado a uma organização com slug `checklists`, mas a intenção era criar uma **nova organização chamada GRCHECK** (paralela ao GRTI e ao CGPS Operacional) que hospedaria esse módulo. Este plano corrige isso.

## 1. Backend (1 migration)

- **Criar** a organização `GRCHECK` com slug `grcheck` na tabela `organizations` (via migration com `INSERT ... ON CONFLICT DO NOTHING` para ser idempotente).
- **Remover** a organização antiga com slug `checklists` (após mover qualquer vínculo existente para `grcheck`, se houver — hoje não há dados de produção nela).
- Nenhuma tabela `chk_*` muda de schema: elas continuam multi-tenant via `organization_id`, apenas passam a apontar para a nova org.
- Vincular o usuário atual (super admin) à `grcheck` como `admin` via `user_organizations` + `user_organization_roles`.

## 2. Frontend

Trocar todas as referências de slug `checklists` para `grcheck`:

- `src/config/menuItems.ts` → `orgSlugs: ["checklists"]` vira `orgSlugs: ["grcheck"]` em todos os itens `chk-*`.
- `src/pages/EscolherOrganizacao.tsx` → no mapa `ORG_DESCRIPTIONS`, renomear a chave `"checklists"` para `"grcheck"` com título/subtítulo apropriados ("GRCHECK — Checklists e Auditoria").
- Grep no restante do código (`AppLayout`, hooks, etc.) por `"checklists"` como slug e ajustar onde for identificador de organização (rotas `/checklists/*` **permanecem** — são o path do módulo, não o slug da org).

## 3. Manter as rotas `/checklists/*`

As URLs das páginas (`/checklists`, `/checklists/modelos`, etc.) **não mudam** — são o caminho do módulo dentro do app. O que muda é apenas o slug da organização que dá acesso a essas rotas (`grcheck`).

## 4. Reverter o LinkOrgModal (opcional)

O `LinkOrgModal.tsx` criado na última rodada continua útil como ferramenta genérica de vínculo user↔org e pode ser mantido. Se você preferir removê-lo agora que a org será GRCHECK e o vínculo será feito via migration, avise que eu removo.

## 5. Verificação

- `tsgo --noEmit` limpo.
- Login com o usuário vinculado → tela "Escolher organização" mostra card **GRCHECK** ao lado de GRTI e CGPS Operacional.
- Ao selecionar GRCHECK, o menu lateral mostra apenas os itens `chk-*` e as rotas `/checklists/*` funcionam.
- Nenhum resquício da org antiga `checklists` no banco.

## Detalhes técnicos

- Migration em uma única transação: `INSERT` da org `grcheck` → `UPDATE` de eventuais linhas `chk_*.organization_id` da org antiga para a nova → `DELETE FROM user_organizations WHERE organization_id = <old>` → `DELETE FROM organizations WHERE slug = 'checklists'`.
- O vínculo do seu usuário à `grcheck` como `admin` entra na mesma migration (preciso do seu e-mail de login para o `WHERE email = ...`, ou posso vincular **todos** os super admins automaticamente).

## Pergunta antes de executar

Quer que eu vincule automaticamente **todos os super admins** à nova org `grcheck` como `admin` (evita precisar do seu e-mail), ou prefere informar um e-mail específico?
