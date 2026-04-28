## Reduzir consumo do Cloud (pós-remoção do SLA)

O cron `check-sla-every-minute` já foi desativado e o `cleanup-logs-daily` está rodando — então o sangramento parou. Mas restam três fontes de custo que dá pra cortar agora:

1. **Espaço físico não foi devolvido ao SO** — os DELETEs anteriores reduziram linhas, mas as tabelas continuam ocupando 62 MB no disco (`cron.job_run_details` 32 MB, `net._http_response` 30 MB). Postgres só libera com `VACUUM FULL`.
2. **Retenção de logs ainda generosa** — agora que não temos mais cron de minuto em minuto, dá pra encurtar a janela.
3. **Artefatos órfãos do SLA** — edge function `check-sla`, coluna `sla_deadline` com default `now() + 6h`, página `AuditoriaSla`, e código que ainda lê esses campos.

---

### Passo 1 — Liberar espaço em disco (impacto imediato no tamanho do instance)

Rodar `VACUUM FULL` nas tabelas infladas. Isso reescreve a tabela e devolve o espaço:

```sql
VACUUM FULL cron.job_run_details;
VACUUM FULL net._http_response;
VACUUM FULL public.webhook_logs;
```

Resultado esperado: banco cai de ~78 MB para ~16 MB (–80%). Backups, snapshots e I/O proporcionalmente menores.

### Passo 2 — Encurtar retenção do `cleanup-logs-daily`

Hoje guarda 7 dias de cron/net e 30 dias de webhooks. Sem o cron de minuto, 7 dias de `cron.job_run_details` é exagero — `cleanup-logs-daily` roda 1x/dia, são literalmente 7 linhas. Ajustar para:

```sql
DELETE FROM cron.job_run_details WHERE start_time < now() - interval '2 days';
DELETE FROM net._http_response   WHERE created    < now() - interval '2 days';
DELETE FROM public.webhook_logs  WHERE created_at < now() - interval '14 days';
```

E adicionar `VACUUM` (não FULL) ao final do job pra manter a tabela enxuta dia a dia:

```sql
VACUUM (ANALYZE) cron.job_run_details;
VACUUM (ANALYZE) net._http_response;
```

### Passo 3 — Remover artefatos órfãos do SLA

**Edge function** `supabase/functions/check-sla/index.ts` — não é mais chamada por ninguém. Deletar a função (deploy automático cuida).

**Página `src/pages/AuditoriaSla.tsx`** — tela de auditoria de SLA. Verificar se ainda está roteada em `App.tsx` e no menu; se sim, remover rota + link.

**Coluna `sla_deadline`** — manter para compatibilidade histórica, mas remover o default `now() + 6h` para tickets novos não gravarem mais valor inútil:

```sql
ALTER TABLE public.tickets ALTER COLUMN sla_deadline DROP DEFAULT;
```

**Coluna `original_assigned_to`** — usada só pelo fluxo antigo de "ticket virou Disponível por SLA". Manter no banco (tem dados históricos), mas não escrever mais nela em código novo.

### Passo 4 — Verificar uso da função `check-sla` no código

Buscar referências a `check-sla`, `sla_deadline`, `AuditoriaSla` em `src/` e remover imports/chamadas que sobraram.

---

## O que NÃO mexer

- `ticket_history`, `audit_logs` — pequenos (<1 MB) e têm valor de auditoria. Manter sem retenção forçada.
- Default de `sla_deadline` em tickets antigos — não tocar; é histórico.
- Cron `cleanup-logs-daily` — manter, só ajustar o SQL interno.

---

## Impacto esperado

| Item | Antes | Depois |
|---|---|---|
| Tamanho do banco | 78 MB | ~16 MB |
| Linhas em `cron.job_run_details` | 10.080 | <10 (cresce só com cleanup) |
| Edge function `check-sla` | órfã, deployada | removida |
| Default `sla_deadline` em novos tickets | now()+6h | NULL |

Custo Cloud deve cair mais um degrau — principalmente storage e backup. Compute já estava baixo desde que o cron de minuto foi desligado.

---

## Detalhes técnicos

**Migrações SQL (uma migração + um insert/script):**

Migração (schema):
```sql
ALTER TABLE public.tickets ALTER COLUMN sla_deadline DROP DEFAULT;
```

Insert (data/manutenção, via tool de insert):
```sql
SELECT cron.unschedule('cleanup-logs-daily');
SELECT cron.schedule('cleanup-logs-daily', '0 3 * * *', $$
  DELETE FROM cron.job_run_details WHERE start_time < now() - interval '2 days';
  DELETE FROM net._http_response   WHERE created    < now() - interval '2 days';
  DELETE FROM public.webhook_logs  WHERE created_at < now() - interval '14 days';
  VACUUM (ANALYZE) public.webhook_logs;
$$);

VACUUM FULL cron.job_run_details;
VACUUM FULL net._http_response;
VACUUM FULL public.webhook_logs;
```

**Arquivos a remover/editar:**
- Deletar edge function `supabase/functions/check-sla/`
- `src/pages/AuditoriaSla.tsx` — remover se não for mais usada
- `src/App.tsx` — remover rota de AuditoriaSla
- `src/components/AppLayout.tsx` (ou onde está o menu) — remover link
- Qualquer leitura de `sla_deadline` em `src/pages/Chamados.tsx`, `TicketDetailModal.tsx`, hooks

**Memória do projeto:** adicionar nota de que `sla_deadline` e `original_assigned_to` são colunas legadas (não escrever).
