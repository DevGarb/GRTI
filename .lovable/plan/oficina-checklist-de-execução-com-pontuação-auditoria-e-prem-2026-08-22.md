# Oficina: checklist de execução com pontuação, auditoria e premiação por pontos

Substitui a tela atual de Premiações (valor fixo em R$ por OS) por um fluxo completo: **Empresa → Tipo de serviço → Checklist → Itens executados → Pontos → Adicionais → Auditoria → Pontos aprovados → Premiação progressiva**. Escopo restrito ao módulo Oficina.

Decisões já alinhadas: auditoria feita pelo **Admin da Oficina** (login por PIN, sem novo perfil); **histórico de OS finalizadas será migrado** para pontos; **faixas de premiação editáveis pelo admin** (sem mexer em código).

## 1. Banco de dados (uma migração)

Novas tabelas (todas com GRANTs `authenticated`/`service_role` + RLS por organização no padrão das `op_*`):

- `op_service_types` — catálogo de tipos de serviço/checklists: `name`, `description`, `active`, `organization_id`.
- `op_service_type_items` — itens de cada checklist: `service_type_id`, `label`, `points` (numeric), `position`, `is_required`, `active`.
- `op_service_type_companies` — vínculo N:N checklist ↔ empresa (mesmo checklist para várias empresas).
- `op_extra_services` — biblioteca de serviços adicionais: `name`, `points`, `active`.
- `op_extra_service_companies` — vínculo N:N adicional ↔ empresa.
- `op_os_service_items` — instância por OS (a fonte da pontuação): `service_order_id`, `item_type` (`checklist` | `adicional` | `nao_cadastrado`), `label`, `points` (solicitado), `done`, `done_at`, `done_by`, `approved` (null = pendente, true/false após auditoria), `points_approved` (null até auditar), `audit_note`, `position`.
- `op_award_tiers` — faixas progressivas: `from_points`, `to_points` (null = sem teto), `rate_brl`, `position`, `active`.

Alterações em `op_service_orders`: `service_type_id` (FK), `points_requested`, `points_approved`, `points_status` (`pendente` | `aprovada` | `ajustada`), `points_audited_by`, `points_audited_at`.

Trigger `AFTER INSERT` em `op_service_orders`: quando `service_type_id` presente, copia os itens ativos do checklist para `op_os_service_items`.

**Migração do histórico:** OS finalizadas existentes recebem um item único "Serviço realizado (legado)" já aprovado, com pontos convertidos do valor atual de premiação (R$ 10 = 1 ponto) — preserva o histórico no novo modelo.

**Seed inicial** (na migração, conforme especificação): Revisão Simples (3 pts), Revisão Geral (5 pts), Colisão Resolve (7 pts, só RESOLVE), Ajuste Simples/Intermediário/Finalização (RESOLVE), biblioteca de 13 serviços adicionais com os pontos informados, e as 3 faixas (até 50 = R$10 · 51–99 = R$15 · 100+ = R$20).

## 2. Abertura da OS (admin, mecânico e agendamento)

- Passo 1: selecionar empresa (já obrigatória). Passo 2: tipo de serviço — o seletor lista **somente checklists vinculados àquela empresa** (`op_service_type_companies`).
- Ao salvar, o trigger gera o checklist da OS automaticamente.
- Aplicado nos 3 pontos de criação: Nova OS (admin), Entrada de moto (mecânico), Abrir OS a partir de agendamento.

## 3. Execução pelo mecânico (`OpOficinaMinhas.tsx`)

- Novo bloco "Serviços e pontuação" no card/modal da OS: itens do checklist marcáveis com os pontos de cada item visíveis; soma automática **"Pontuação da OS: X / Y"**.
- Mecânico pode apenas: marcar/desmarcar (antes da finalização), observar, anexar fotos. **Nunca edita pontos.**
- **Adicionar serviço extra**: seletor da biblioteca filtrado pela empresa da OS; soma ao total da OS. Bloqueio de duplicidade por nome normalizado: se o serviço já consta no checklist da OS, exibe *"Este serviço já está incluído no checklist desta OS."*
- **"Serviço não cadastrado"**: campo livre, entra como item sem pontos e status pendente de avaliação; o admin define os pontos na auditoria e pode promovê-lo à biblioteca.
- Observação de fechamento permanece como campo complementar (não calcula pontos).
- Ao finalizar: `points_requested` calculado e `points_status = pendente`. O checklist genérico atual (`op_service_order_checklist`, barra de progresso) continua existindo — não é removido.

## 4. Auditoria (nova aba admin `/op/oficina/auditoria`)

- Lista OS finalizadas pendentes de validação com: empresa, OS, mecânico, tipo de checklist, itens executados e pontos de cada um, adicionais, total solicitado, observação de fechamento e fotos (Fancybox).
- Ações por OS: **Aprovar** (libera a pontuação solicitada) ou **Ajustar** (desmarcar itens não comprovados / alterar pontos de item avulso) — recalcula `points_approved`; só o aprovado conta no resultado.
- Guarda `points_audited_by`/`points_audited_at` e nota de auditoria (histórico solicitado × aprovado).

## 5. Premiações por pontos (substitui `OpOficinaPremiacoes.tsx`)

- Mesma rota `/op/oficina/premiacoes`, reescrita: totais em **pontos aprovados** por mecânico no mês e valor calculado pelas faixas progressivas de `op_award_tiers` (ex.: 70 pts = 50×R$10 + 20×R$15 = R$800).
- Mantém filtros (mês, mecânico, empresa), CSV e o fluxo Validar → Enviar ao DP, agora sobre o valor calculado por pontos.

## 6. Painel do mecânico (nova aba "Meus pontos")

- Cards: **Pontos do mês** (aprovados), **Faixa atual** (R$/ponto), **Próxima faixa**, **Faltam X pontos**; barra de progresso.
- Tabela das OS do período: OS, empresa, serviço, pontos, status da validação (Aprovada / Em auditoria / Ajustada).

## 7. Área administrativa de pontuação (nova aba admin `/op/oficina/pontuacao`)

- **Checklists**: criar/editar/ativar-desativar, definir itens com pontos individuais, obrigatoriedade, ordem e empresas vinculadas (multi-seleção).
- **Serviços adicionais**: CRUD com pontos e vínculo a empresas.
- **Faixas de premiação**: CRUD das faixas progressivas (de/até pontos, R$ por ponto).
- Empresas continuam gerenciadas no cadastro existente (`is_workshop`).

## Regras garantidas

Mecânico não altera pontos · pontuação calculada automaticamente · só pontua item marcado como executado · sem duplicidade checklist × adicional · adicionais executados somam na OS · pontos só valem após auditoria · serviço não cadastrado exige avaliação · observação não calcula pontos · checklist compartilhável entre empresas · pesos e faixas editáveis pelo admin · histórico solicitado × aprovado preservado.

## Detalhes técnicos

- Migração única com as 7 tabelas novas (GRANTs antes das policies, RLS via `organization_id` no padrão `is_op_staff`), colunas novas em `op_service_orders`, trigger de cópia do checklist, seed dos checklists/adicionais/faixas e backfill legado.
- Novo hook `useOficinaScoring` em `src/hooks/useOficina.ts` (tipos de serviço, itens da OS, adicionais, faixas, totais por mecânico) e helper `src/lib/oficinaScoring.ts` (cálculo progressivo das faixas + soma da OS), com teste unitário do cálculo progressivo.
- Novos componentes em `src/components/operacional/`: `OsScoredChecklist.tsx` (execução), `OsAuditPanel.tsx` (auditoria), `MechanicPointsCard.tsx` (painel do mecânico).
- Rotas novas em `App.tsx` + abas em `OficinaNav.tsx`: admin ganha "Auditoria" e "Pontuação"; mecânico ganha "Meus pontos".
- Tela antiga de premiação por R$/OS é substituída; `award_amount` legado só usado na conversão do histórico.
- Validação: testes unitários do cálculo de faixas e da regra anti-duplicidade, verificação no preview (criar OS com checklist, marcar itens, auditar, conferir pontos e premiação) e `bun run build`.
