## Novo fluxo de abertura de chamados (sem técnico, sem SLA)

A partir de agora, todo chamado novo nasce **sem técnico atribuído** e cai direto em **Chamados em Aberto**, onde os próprios técnicos podem assumir. O admin continua podendo atribuir manualmente para um técnico específico pelo modal do chamado. Tickets já existentes não são alterados.

---

### 1. Modal de Novo Chamado (`NewTicketModal.tsx`)

**Remover:**
- Campo "Técnico Responsável" (select).
- Validação `!assignedTo` que bloqueia o botão "Criar Chamado".
- Imports não usados: `useTechnicianProfiles`.

**Manter:** Título, Descrição, Prioridade, Tipo, Setor (opcional), Anexos.

**Resultado:** Chamado é criado sem `assigned_to`, com status `"Aberto"`, ficando visível na aba **Chamados em Aberto** para todos os técnicos.

### 2. Hook `useCreateTicket` (`useTickets.ts`)

- Tirar `assigned_to` do tipo `CreateTicketInput`.
- Garantir `assigned_to: null` no insert (já não recebe valor).

### 3. Modal de Detalhes do Chamado (`TicketDetailModal.tsx`)

**Atribuição manual pelo admin:**
- O select de "Técnico" no bloco "People" já existe e já está restrito a `canEditPeople` (admin/super_admin). Vou apenas garantir que:
  - Admin pode trocar/atribuir o técnico mesmo quando o chamado está em status `"Aberto"` ou `"Disponível"`.
  - Ao admin atribuir um técnico em um chamado `"Aberto"`, o status passa automaticamente para `"Em Andamento"` (igual a quando o técnico se auto-atribui via `usePickTicket`), registrando histórico `assigned`.
  - Disparar webhook `ticket_assigned` (e WhatsApp) ao admin atribuir.

**Remover exibição de SLA:**
- Tirar o bloco que mostra "SLA Expirado", contador de horas/minutos restantes e badge `Disponível por SLA`.
- Manter o status `Disponível` apenas como compatibilidade com chamados antigos (não criamos mais novos com esse fluxo).

### 4. Desativar a contagem de SLA (cron + edge function)

- **Desativar o cron job** `check-sla-every-minute` (`SELECT cron.unschedule('check-sla-every-minute')`).
- **Não chamar mais** `sla_deadline` em telas novas. Coluna permanece no banco (compatibilidade), mas para tickets novos o valor default `now() + 6h` continua sendo gravado e simplesmente ignorado.
- Manter a edge function `check-sla` no projeto (não removo, mas fica órfã, sem custo recorrente).

### 5. Limpeza de tabelas de log infladas (one-shot)

Conforme o diagnóstico anterior, aplicar também:
- `DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';`
- `DELETE FROM net._http_response WHERE created < now() - interval '7 days';`
- `DELETE FROM public.webhook_logs WHERE created_at < now() - interval '30 days';`
- Cron diário de limpeza (`0 3 * * *`) para manter essas tabelas pequenas daqui pra frente.

### 6. Aba "Chamados em Aberto"

Já funciona como você descreveu (lista `Aberto` + `Disponível` com botão "Atribuir para mim"). Vou apenas:
- Esconder o badge laranja "SLA Expirado" para chamados criados a partir de agora (mantenho para os antigos `Disponível`).
- Reforçar título da página: continua "Chamados em Aberto", mas agora será o ponto central de distribuição.

### 7. Páginas de Chamados (`Chamados.tsx`)

- Verificar se há colunas/filtros de SLA visíveis na listagem do técnico/admin e ocultar (ou marcar como legado). Sem mudanças funcionais grandes — apenas remover ruído visual de SLA.

---

## O que NÃO muda

- Tickets antigos com `assigned_to` definido permanecem intactos.
- Status, workflow (Em Andamento → Aguardando Aprovação → Aprovado → Fechado), avaliação CSAT, categorias, projetos/sprints, webhooks, WhatsApp — tudo igual.
- Métricas de produtividade, dashboards e relatórios continuam funcionando (eles olham `assigned_to` no momento do fechamento, que ainda é preenchido quando o técnico assume).
- Login, papéis, multi-tenant, exports — sem alteração.

---

## Detalhes técnicos (referência)

**Arquivos a editar:**
- `src/components/NewTicketModal.tsx` — remover select de técnico e validação.
- `src/hooks/useTickets.ts` — limpar `CreateTicketInput`.
- `src/components/TicketDetailModal.tsx` — esconder bloco de SLA; quando admin atribui técnico em chamado `"Aberto"`/`"Disponível"`, mover status para `"Em Andamento"` + histórico + webhook + WhatsApp.
- `src/pages/ChamadosAbertos.tsx` — pequenas limpezas visuais de SLA.
- `src/pages/Chamados.tsx` — remover colunas/indicadores de SLA, se houver.

**Migração SQL (uma única migração):**
```sql
SELECT cron.unschedule('check-sla-every-minute');

SELECT cron.schedule(
  'cleanup-logs-daily',
  '0 3 * * *',
  $$
    DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
    DELETE FROM net._http_response   WHERE created  < now() - interval '7 days';
    DELETE FROM public.webhook_logs  WHERE created_at < now() - interval '30 days';
  $$
);
```

E uma execução única dos `DELETE`s para liberar os ~62 MB já acumulados.

**Memória do projeto:** atualizar `mem://index.md` removendo a regra "SLA: 6 hours to start. Breached tickets become 'Disponível'" e substituindo por: "Chamados nascem sem técnico em 'Aberto'; técnicos auto-atribuem ou admin atribui manualmente. Sem SLA automático."

---

## Impacto esperado

- **UX**: solicitante abre chamado mais rápido (menos um campo).
- **Custo Cloud**: queda drástica (cron parado + tabelas de log enxutas).
- **Distribuição de trabalho**: técnicos puxam demanda na fila comum; admin mantém controle de roteamento direto.
