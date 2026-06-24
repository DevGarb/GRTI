# Complemento MVP Software — Plano

Expande a aba **Projetos** com três frentes novas (MVP Individual, MVP Equipe, Penalidades) e enriquece os controles existentes de **Retrabalho** e **Qualidade Técnica**. Tudo alimentado pelos dados já existentes em `projects`, `project_tasks`, `sprints`, `sprint_quality_checks` e `mvp_awards`.

---

## 1. Banco de dados (1 migration)

### Novas colunas
- `project_tasks`: `rework_reason text`, `rework_category text` (Erro funcional, Regra de negócio, Integração, Frontend/UI, Documentação, Homologação reprovada), `rework_requested_by uuid`, `rework_notes text`.
- `sprints`: `delivered_late boolean`, `late_justification text`, `late_approved_by uuid`.

### Nova tabela `mvp_penalties`
Campos de domínio: `user_id`, `organization_id`, `scope` (`mvp` | `operacional`), `type` (falta_injustificada, atrasos_15min, advertencia, suspensao, sprint_atrasada, backlog_parado, homologacao_reprovada, sem_documentacao, sem_evidencia), `percent_impact numeric`, `quality_impact numeric`, `reference_date date`, `project_id`, `sprint_id`, `task_id`, `justification text`, `evidence_url text`, `status` (pendente, aprovado, rejeitado), `requested_by`, `approved_by`, `approved_at`, `notes`, `year int`, `month int`, timestamps.
- Grants padrão (authenticated + service_role), RLS por organização, admin pode INSERT/UPDATE, colaborador apenas SELECT das próprias.
- Trigger `audit_logs` em INSERT/UPDATE/DELETE para trilha completa.

### Nova tabela `mvp_penalty_history`
Histórico imutável de mudanças de status (snapshot before/after), gravada via trigger.

### RPCs
- `get_mvp_individual(_user_id, _year, _month)` → todos os números do card individual + projeções (faltam X entregas para 100%, impacto dos retrabalhos no score atual).
- `get_mvp_team_ranking(_org, _year, _month)` → ranking colaboradores, sprints, projetos com métricas agregadas.
- `get_mvp_team_evolution(_org, _months_back)` → série mensal para gráficos.
- `request_penalty(...)` / `approve_penalty(_id, _approve, _notes)` (security definer, exige admin).
- `apply_penalties_to_award(_org, _year, _month)` → ajusta `mvp_awards.amount_brl` e nível conforme penalidades **aprovadas**; suspensão zera o prêmio.
- Atualizar `compute_mvp_awards` e `get_mvp_metrics` para descontar penalidades aprovadas (operacionais reduzem Eficiência Operacional; MVP reduzem score final; documentação/evidência reduzem Qualidade Técnica).
- Atualizar `task_status_change_trigger` para aceitar payload de retrabalho (reason/category/requested_by/notes) gravado em `task_status_history.metadata`.

---

## 2. Frontend (rota `/projetos`)

### Novas sub-abas no `ProjetosLayout`
- **MVP** (existente — vira "MVP Equipe" com dashboard gerencial).
- **Meu MVP** (novo) — visão individual do colaborador logado; gestores podem trocar de pessoa.
- **Penalidades** (novo) — somente admin/desenvolvedor enxerga no menu.

### `ProjetosMeuMVP.tsx`
- Header com nome, avatar, mês.
- Cards: Projetos ativos, Backlogs, Sprints, Planejadas, Concluídas, Atrasadas, Retrabalhos, Qualidade Técnica %, Eficiência Operacional %, Eficiência Final %.
- Badge grande Ouro / Prata / Fora.
- Painel "Projeções": *faltam X entregas no prazo para Ouro*, *cada retrabalho a mais reduz Y%*, *score projetado se mantiver ritmo*.
- Lista das penalidades aprovadas do mês com impacto.

### `ProjetosMVP.tsx` (Equipe — refatorar atual)
- Mantém tabela atual, adiciona abas internas:
  - **Ranking** (colaboradores / sprints / projetos).
  - **Gráficos** (Recharts): evolução mensal do score médio, retrabalho por colaborador (barras), entregas por colaborador, qualidade técnica por colaborador.
- Filtro por mês/ano já existe.

### `ProjetosPenalidades.tsx` (novo)
- Tabela com filtros: Colaborador, Projeto, Sprint, Período, Tipo.
- Botão "Registrar penalidade" (admin) → dialog com Colaborador, Tipo (lista fixa com % automático), Data, Justificativa, Evidência (upload `attachments/penalties/`), Projeto/Sprint opcional.
- Fluxo: pendente → aprovado/rejeitado por outro admin (ou mesmo admin com observação).
- KPIs do mês: total de penalidades, impacto agregado no MVP, top 3 motivos.
- Histórico completo + auditoria.

### Retrabalho — UI
- No `BacklogKanban` e `TaskDetailModal`, ao mover card de **Concluído → outro status**, abrir dialog obrigatório:
  - Categoria (select), Solicitante (auto = user atual, editável p/ admin), Motivo (textarea), Observação opcional.
- Salvar via update de `project_tasks` (trigger gera histórico + incrementa rework_count + muda status para `Retrabalho`).

### Qualidade Técnica — UI
- `CloseSprintDialog` já tem 5 itens + evidências (implementado). Apenas renomear labels para casar com o briefing: Documentação atualizada / Evidências anexadas / Homologação realizada / Backlog atualizado / Conformidade técnica.

---

## 3. Regras de negócio aplicadas

| Penalidade | Tipo | Impacto |
|---|---|---|
| Falta injustificada | mvp | -25% score final |
| 3+ atrasos >15min | mvp | -10% score final |
| Advertência | mvp | -50% score final |
| Suspensão | mvp | desclassifica (amount = 0, level = none) |
| Sprint atrasada s/ justificativa | operacional | -5% Eficiência Op |
| Backlog parado >5 dias úteis | operacional | -2% Eficiência Op |
| Homologação reprovada | operacional | +1 retrabalho |
| Sem documentação | operacional | -5% Qualidade Técnica |
| Sem evidência | operacional | -5% Qualidade Técnica |

Aplicação **apenas** quando `status = 'aprovado'`. `compute_mvp_awards` consulta `mvp_penalties` aprovadas do mês e ajusta valores antes de gravar.

---

## 4. Detalhes técnicos

**Hooks novos:** `useMvpIndividual`, `useMvpTeamRanking`, `useMvpEvolution`, `useMvpPenalties`, `useCreatePenalty`, `useApprovePenalty`.

**Permissões:** aba Penalidades visível só para `admin`/`super_admin`/`desenvolvedor`; criação restrita a admin via RLS + checagem em RPC.

**Auditoria:** todo INSERT/UPDATE em `mvp_penalties` grava em `audit_logs` (action = `penalty_*`) com snapshot completo.

**Storage:** evidências em `attachments/penalties/{org}/{user}/{uuid}.{ext}`.

**Menu lateral:** sem mudanças — tudo continua dentro de `/projetos`.

---

## 5. Entrega

Big bang em uma única iteração:
1. Migration (tabelas + colunas + RPCs + grants + RLS).
2. Hooks + páginas novas (`ProjetosMeuMVP`, `ProjetosPenalidades`).
3. Refator `ProjetosMVP` com abas internas + gráficos.
4. Dialog de retrabalho categorizado em Kanban / TaskDetail.
5. Ajuste de labels no checklist de sprint.

Sem mexer em outras áreas do sistema.