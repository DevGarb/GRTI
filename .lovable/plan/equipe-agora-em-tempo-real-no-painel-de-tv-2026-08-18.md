# Equipe Agora em tempo real no Painel de TV

Hoje o painel só atualiza os cards de "Equipe Agora" a cada 5 minutos (recarga periódica). A única atualização instantânea existente é para **novos chamados**, via um aviso enviado pelo banco para o canal público `tv:<slug>` — que também dispara uma recarga dos dados.

Ou seja: quando um técnico inicia um chamado, muda de status ou move uma tarefa de projeto para "Em Dev", o painel só reflete isso no próximo ciclo de 5 minutos.

## O que muda

1. **Aviso do banco em qualquer mudança relevante de chamado**
   - Além do gatilho atual de criação, passar a avisar o canal `tv:<slug>` também quando um chamado for alterado (status, técnico atribuído, início, fechamento) e quando for excluído.
   - Esse aviso usa um evento novo (`ticket_changed`), separado do `new_ticket`, para **não** disparar banner nem som no painel — só recarregar os dados.

2. **Aviso do banco em mudança de status de tarefa de projeto**
   - Gatilho equivalente em tarefas de projeto, para que "Em Dev" / "Concluído" apareçam imediatamente no contador "Projetos" dos cards.

3. **Painel escuta os novos eventos**
   - No painel de TV, o canal já existente passa a tratar `ticket_changed` e `task_changed` recarregando os dados silenciosamente.
   - Recarga agrupada em uma janela curta (~1,5s) para evitar dezenas de recargas em rajada.

4. **Rede de segurança**
   - Reduzir a recarga periódica de 5 minutos para 60 segundos, cobrindo casos em que a conexão em tempo real caia (kiosk em TV fica dias aberto).
   - Reconexão automática já é feita pelo cliente; nada extra necessário.

## Detalhes técnicos

- Migração: novos gatilhos `AFTER UPDATE OR DELETE ON public.tickets` e `AFTER INSERT OR UPDATE OF status ON public.project_tasks`, chamando funções `security definer` que usam `realtime.send(..., 'tv:'||slug, false)`, no mesmo padrão de `tv_notify_new_ticket` (com `exception when others then return`, para nunca bloquear a escrita).
- No update de chamados, só emitir quando um campo que o painel usa mudar (`status`, `assigned_to`, `started_at`, `closed_at`, `organization_id`), evitando ruído.
- `src/pages/TvDashboard.tsx`: adicionar handlers `.on("broadcast", { event: "ticket_changed" | "task_changed" })` chamando um `scheduleRefetch()` com debounce que invoca `query.refetch()` (e `agendaQuery.refetch()` quando ativa); ajustar `refetchInterval` para `60_000`.
- Nenhuma alteração na edge function `tv-dashboard` — ela já calcula `team_status` corretamente a cada chamada.
