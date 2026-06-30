## Confirmação sobre o Victor

Sim — o **Victor Hugo Coriolano Borges** está com o **mesmo bug do Danilo**, e em escala ainda maior:

- **62 chamados** fechados em junho/2026
- **42 deles (68%)** não têm a transição `status_change → "Em Andamento"` no histórico
- Vários estão com janela bruta de **+400 horas** (ex.: "Eventos - Resolve" = 477h) porque o `started_at` cai no `created_at` e o cálculo legado vai até `closed_at`

O **Victor Vasconcelos** não tem chamados fechados nesse período, então não é afetado agora.

O Danilo (64 chamados) já passou pelo backfill anterior e está consistente.

---

## Plano de ação

### Parte 1 — Corrigir o Victor (mesmo tratamento do Danilo)

Migração de dados (sem mexer em functions, triggers, nem em chamados já consistentes):

1. Para cada chamado do Victor Hugo fechado sem transição `Em Andamento` no histórico, sintetizar eventos baseados em sinais reais:
   - `started_at` ← primeiro entre: `picked_at`, primeiro `ticket_history.action='assigned'` para o Victor, ou primeiro comentário técnico do Victor (o que vier antes do `closed_at`).
   - Inserir `ticket_history` sintéticos: `status_change → "Em Andamento"` no novo `started_at` e `status_change → "Aguardando Aprovação"` (ou `Fechado`) imediatamente antes do `closed_at` quando não houver outro sinal de pausa.
2. Não tocar nos 20 chamados que já têm histórico correto.
3. Recalcular cache (invalidar `metas-tecnicos`, `mvp-metrics`).

### Parte 2 — Verificação automática de distorções

Criar mecanismo passivo de detecção (sem alterar nenhuma function/trigger crítica de TMA, top-ups ou MVP):

**Nova tabela** `ticket_tma_anomalies` (audit-only, não entra em cálculo):
- `ticket_id`, `assigned_to`, `anomaly_type`, `severity`, `detected_at`, `details jsonb`, `reviewed_at`, `reviewed_by`, `dismissed`, `notes`

**Função `detect_tma_anomalies()`** (SECURITY DEFINER, idempotente, apenas LEITURA das tabelas operacionais + INSERT/UPDATE na tabela nova). Sinaliza um chamado quando qualquer regra dispara:

| Tipo                         | Regra                                                                                  | Severidade |
|------------------------------|----------------------------------------------------------------------------------------|------------|
| `missing_em_andamento`       | `status='Fechado'` e nenhum `status_change → "Em Andamento"` no histórico              | alta       |
| `missing_close_event`        | `status='Fechado'` e nenhum `status_change → "Aguardando Aprovação/Aprovado/Fechado"` | alta       |
| `inflated_window`            | janela bruta > 5× a janela útil do ticket (created→closed vs business minutes)         | média      |
| `started_after_closed`       | `started_at > closed_at`                                                               | crítica    |
| `assigned_without_started`   | `picked_at` definido há > 4h úteis sem entrar em "Em Andamento"                        | baixa      |
| `long_open_no_activity`      | `status='Aberto'`/`Em Andamento` há > 7 dias sem comentário nem mudança               | média      |

**Cron** (`pg_cron`, 1×/dia às 04:00): roda `detect_tma_anomalies()` para chamados modificados nas últimas 48h + um varredura completa dos abertos. Não modifica `tickets`, nem `started_at`, nem `ticket_history`.

### Parte 3 — UI: "Revisão de TMA" (admin only)

Sub-aba dentro de **Metas → MVP** (ou Auditoria) chamada **"Revisão de TMA"**:

- Lista paginada das anomalias não resolvidas, agrupadas por técnico
- Para cada item: chamado, tipo de anomalia, severidade, valor detectado, técnico
- Ações por linha:
  - **Abrir chamado** (reaproveita `TicketDetailModal` — admin já pode editar `Início Atend.` lá)
  - **Marcar como revisado** (preenche `reviewed_at`/`reviewed_by`)
  - **Descartar com nota** (`dismissed=true`, exige `notes`)
- Badge de contagem no menu lateral quando há anomalias críticas/altas pendentes.

### Parte 4 — Garantias de não-regressão

- A função de detecção é **somente leitura** sobre `tickets`/`ticket_history`.
- `get_metas_tecnicos`, triggers de `started_at`, MVP awards e penalidades **não são alterados**.
- Top-ups, `compute_mvp_awards`, `get_mvp_metrics`, `get_mvp_evolution_v2` permanecem como estão.
- A nova tabela e o cron só *observam*; toda correção continua sendo manual via modal pelo admin.

---

## Arquivos previstos

**Backend (migration única):**
- `CREATE TABLE public.ticket_tma_anomalies` + GRANTs + RLS (admin/super_admin)
- `CREATE FUNCTION public.detect_tma_anomalies()` SECURITY DEFINER
- `SELECT cron.schedule('detect-tma-anomalies-daily', ...)`
- Data fix do Victor (UPDATE/INSERT pontual em `tickets` + `ticket_history` dele)

**Frontend:**
- `src/hooks/useTmaAnomalies.ts`
- `src/components/metas/TmaAnomaliesPanel.tsx`
- Integração da sub-aba em `src/pages/metas/MetasLayout.tsx` (ou criação de `src/pages/metas/MetasRevisaoTMA.tsx`)
- Badge de contagem no menu (`src/components/AppLayout.tsx`)

Posso seguir com a implementação?
