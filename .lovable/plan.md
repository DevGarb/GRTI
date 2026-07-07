## Objetivo
Aliviar processamento removendo polling redundante, restringindo escopo de subscriptions realtime e reduzindo frequência de cron não crítico.

## Mudanças

### 1. `src/pages/Chamados.tsx` (linha 368)
Remover `refetchInterval: 60_000` do `useQuery` da lista de chamados. O realtime já atualiza a lista.

Manter o `setInterval` de 60s da linha 51 (`SlaTimer`), que é apenas o ticker visual do cronômetro de SLA quando o chamado está "Em Andamento" — não é polling de rede.

### 2. `src/hooks/useSprints.ts`
O canal escuta `tickets` e `project_tasks` sem filtro (dispara invalidação em qualquer mudança do sistema). Adicionar filtros no `postgres_changes`:

```ts
{ event: "*", schema: "public", table: "tickets", filter: `project_id=eq.${projectId}` }
{ event: "*", schema: "public", table: "project_tasks", filter: `project_id=eq.${projectId}` }
```

Assim só reagem a mudanças de tickets/tasks daquele projeto.

### 3. `src/hooks/useProjects.ts`
Canal global `projects-realtime` escuta `projects` e `sprints` sem filtro. Como a lista é escopada por organização, adicionar filtro por `organization_id` quando `profile?.organization_id` existir:

```ts
{ event: "*", schema: "public", table: "projects", filter: `organization_id=eq.${orgId}` }
{ event: "*", schema: "public", table: "sprints", filter: `organization_id=eq.${orgId}` }
```

Incluir `orgId` nas deps do `useEffect` e no nome do canal (`projects-realtime-${orgId}`) para recriar quando o usuário troca de org.

### 4. Cron `send-management-report-daily`
Atualmente `*/5 * * * *` (a cada 5 min). Alterar para `*/15 * * * *` via `supabase--insert` executando:

```sql
SELECT cron.alter_job(job_id := 6, schedule := '*/15 * * * *');
```

## Verificações após aplicar
1. `tsgo` (typecheck) — garantir que os edits em hooks compilam.
2. Confirmar cron atualizado: `SELECT jobid, jobname, schedule FROM cron.job WHERE jobid = 6;`
3. Playwright rápido em `/chamados` autenticado: abrir a página, checar console sem erros de subscription, confirmar que a lista carrega. (Se `LOVABLE_BROWSER_AUTH_STATUS` não estiver `injected`, pular e apenas validar build/typecheck.)
4. Abrir `/projetos` e um `/projetos/:id` para confirmar que sprints e projects continuam sendo invalidados corretamente ao mexer em um ticket do projeto (via replay do session logs / console).

## Riscos e mitigação
- **Filtro realtime só aceita uma condição de igualdade** — os filtros propostos usam `eq`, suportados nativamente.
- **`organization_id` pode ser `null`** em projetos legados — nesse caso o filtro exclui esses registros do realtime. Mitigação: só aplicar o filtro quando `orgId` existir; se `orgId` for `undefined`, manter comportamento atual (sem filtro) para não quebrar contas sem organização.
- **Cron a cada 15 min**: relatório continua diário, apenas com janela de disparo maior. Sem impacto funcional.