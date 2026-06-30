## Problema

Felipe (4d) e Izabele (3d 3h) estão com TMA inflado pelo **mesmo bug** que afetou Danilo e Victor Hugo:
- Felipe: **103 de 128** chamados fechados em junho/26 sem o evento "Em Andamento" no histórico.
- Izabele: **89 de 105** chamados na mesma situação.

Sem esse evento, a função `get_metas_tecnicos` cai no fallback `created_at → closed_at`, contando dias inteiros (inclusive fora do horário) em vez do tempo real de atendimento.

## Solução

Aplicar exatamente o mesmo backfill já usado para Danilo e Victor Hugo, escopado **apenas** aos chamados de junho/26 do Felipe e da Izabele que estão sem evento "Em Andamento":

1. Para cada chamado afetado, determinar o `started_at` real a partir do primeiro sinal de trabalho disponível, na ordem:
   - primeiro `ticket_comments.created_at` do próprio técnico atribuído;
   - `picked_at` (se existir);
   - evento de atribuição em `ticket_history`;
   - como último recurso, `closed_at − 1h` limitado a horário comercial.
2. Atualizar `tickets.started_at` para esse timestamp (somente quando o atual estiver vazio ou anterior ao sinal real).
3. Inserir evento sintético em `ticket_history` (`action='status_change'`, `old_value='Aberto'`, `new_value='Em Andamento'`, `created_at = started_at`) marcado como backfill, para a função `get_metas_tecnicos` enxergar a janela correta.
4. Não tocar em triggers, funções de TMA/MVP, top-ups, nem em chamados de outros técnicos ou de outros meses.

## Validação

- Reexecutar a métrica e confirmar que Felipe e Izabele caem para faixas coerentes (esperado abaixo de 8h, em linha com Danilo/Victor).
- Rodar `detect_tma_anomalies` para confirmar que os `missing_em_andamento` desses dois caem para ~0 em junho/26.
- Confirmar visualmente na aba **Metas** que os outros técnicos continuam iguais.

## Detalhes técnicos

- Operação 100% via migração SQL idempotente (filtra `WHERE assigned_to IN (...) AND closed_at em junho/26 AND NOT EXISTS (evento Em Andamento)`).
- Nenhuma alteração em código frontend nem em definições de função/trigger.
- Backfill marca o `ticket_history` inserido com um campo identificável (ex.: `field_name='backfill_started_at'`) para auditoria, mesmo padrão dos backfills anteriores.
