# Flag "sem iniciar" para todos + rastreio de quem mudou o status na sprint

## 1. Painel de TV: a flag de "chamados sem iniciar" some para quem não está ocioso

Os dados confirmam que hoje existem chamados em "Aberto" já atribuídos para 4 pessoas da equipe (Danilo 4, Victor 3, Felipe 2, Maria Izabele 1). O card só mostra o aviso quando a pessoa está com o selo **Ocioso** — Danilo e Victor têm tarefas de projeto em dev, então não são ociosos e o aviso fica escondido. Por isso só o Felipe aparece.

Mudança (somente visual, no card da Equipe Agora):
- O aviso "N chamados sem iniciar" passa a aparecer sempre que houver chamados atribuídos e não iniciados, independente de estar ocioso.
- Cor vermelha quando a pessoa está ociosa; âmbar quando ela está ocupada (é um alerta menor nesse caso).
- O tooltip continua listando os títulos desses chamados.

Observação: Gabriel Caminha tem 16 chamados "Aberto" atribuídos a ele, mas o cargo dele na organização é **solicitante**, então ele não entra na lista "Equipe Agora" (que só considera técnico/desenvolvedor). Se quiser que ele apareça, é só avisar.

## 2. Projetos: badge com a inicial de quem mudou o status do item da sprint

Toda mudança de status de tarefa já é registrada com o autor (`task_status_history.changed_by`). Vamos exibir isso.

- Ao lado do seletor de status de cada tarefa (na lista da sprint e no backlog), aparece um badge circular com a **inicial** de quem fez a última mudança de status.
- Ao passar o mouse: nome completo, status aplicado e data/hora da mudança (formato BR).
- Também vale para o clique na seta de "aplicar flags de chamado" — o badge reflete quem foi o último a mexer no item.
- Se o registro não tiver autor (mudanças antigas ou feitas por rotina do sistema), mostra um traço neutro em vez da inicial.

## Detalhes técnicos

- `src/components/tv/TeamStatusPanel.tsx`: condição do aviso passa de `m.idle && m.unstarted > 0` para `m.unstarted > 0`, com cor condicional.
- Novo hook `src/hooks/useTaskStatusAuthors.ts`: recebe uma lista de `task_id`, consulta `task_status_history` (ordenada por `changed_at`), reduz para o registro mais recente por tarefa e busca `full_name` em `profiles`. A RLS de leitura por organização já permite essa consulta.
- `src/components/projetos/SprintItems.tsx`: renderiza o badge usando o hook; invalidação da query após `updateTask` para o badge atualizar na hora.
- `src/components/projetos/BacklogKanban.tsx`: mesmo badge no rodapé do card.
- Sem migrações e sem mudanças na edge function.
- Ao final: `bun run build`.
