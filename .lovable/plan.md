## Auditoria e limpeza para reduzir custo de Cloud do GRTI

### Diagnóstico atual

O custo de **$7,92/mês** do GRTI **não vem de uso anormal** — vem do custo fixo de compute do instance Cloud, que é cobrado por hora 24/7 mesmo ocioso. Os outros projetos (Ramos Conecta, Indicação Rápida) custam centavos porque provavelmente estão em instance Nano. O GRTI parece estar em um tier maior.

Volume real verificado: 26 MB de banco, ~70 requests REST/dia, 0 invocações de edge functions/dia, 1 cron diário, nenhum trigger pesado.

### Ação principal (maior impacto)

**Reduzir o tamanho do instance** em **Cloud → Overview → Advanced settings**. O uso atual cabe folgado em Nano/Micro. Essa ação sozinha deve cortar o custo para perto de $1–2/mês.

Isso é uma ação manual sua (não dá para mim alterar o tier via código), mas vou preparar a base para você ter certeza de que reduzir é seguro.

### Plano de auditoria/limpeza (no código e no banco)

1. **Auditar tabelas que crescem sem limite** e definir retenção
   - `ticket_history` (1,2 MB hoje) — cresce a cada mudança de status; sem expurgo
   - `audit_logs` (344 kB) — cresce a cada ação sensível; sem expurgo
   - `webhook_logs` — já tem retenção de 14d via cron
   - `patrimonio_history`, `user_todo_history` — sem expurgo
   - **Entrega:** ampliar `cleanup-logs-daily` para também apagar registros antigos (ex.: >180 dias) dessas tabelas, com limites configuráveis.

2. **Auditar uso de Storage**
   - Listar tamanho dos buckets `attachments`, `patrimonio-photos`, `op-service-orders`, `org-logos`.
   - Identificar arquivos órfãos (anexos de chamados deletados, fotos de patrimônios deletados).
   - **Entrega:** script SQL de diagnóstico + (se houver órfãos) job de limpeza opcional.

3. **Auditar Realtime**
   - Confirmar quais tabelas estão em `supabase_realtime` publication e se todas são realmente assinadas pelo frontend.
   - Realtime ocioso em tabelas grandes aumenta tráfego WAL.
   - **Entrega:** remover do publication tabelas que não precisam de realtime.

4. **Auditar queries pesadas / frequentes**
   - Rodar `pg_stat_statements` para identificar top 10 queries por tempo total.
   - **Entrega:** lista de queries candidatas a otimização ou cache no frontend.

5. **Relatório final**
   - Resumo do que foi limpo, do que ficou e estimativa de impacto.
   - Confirmar que é seguro reduzir o instance no Advanced settings.

### Detalhes técnicos

- Limpezas serão adicionadas à função do cron `cleanup-logs-daily` (já existe, roda 03:00).
- Retenções sugeridas (ajustáveis): `ticket_history` 365d, `audit_logs` 365d, `patrimonio_history` 365d, `user_todo_history` 180d.
- Nenhuma alteração destrutiva sem confirmar tamanhos atuais primeiro.
- Não vou tocar em `tickets`, `evaluations`, `preventive_maintenance` (dados de negócio).

### Fora de escopo

- Alterar o tier do instance (ação manual sua em Advanced settings).
- Refatoração ampla de frontend para reduzir requests (volume já é baixo).
- Migração para outro backend.

Quer que eu siga com os 5 passos, ou prefere começar só pelo passo 1 (retenção em `ticket_history` e `audit_logs`)?
