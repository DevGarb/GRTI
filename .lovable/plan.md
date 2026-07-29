## Objetivo
Ao converter uma tarefa de sprint em chamado, o chamado deve ser sempre atribuído ao **Coordenador TI** (`ti.coordenador@grti.local`), independente de quem executou a ação.

## Alteração
Arquivo: `src/hooks/useProjectTasks.ts` — mutation `useConvertTaskToTicket`.

No insert em `tickets`, adicionar:
- `assigned_to`: `8c2a1788-ec3b-4575-a90c-2d804fa0577e` (Coordenador TI)
- `picked_at`: `new Date().toISOString()` (para consistência com o fluxo de atribuição)

O status permanece `Aberto` (padrão do sistema — técnico inicia o atendimento manualmente).

## Detalhes técnicos
Para evitar hard-code espalhado, o UUID será definido como constante no topo do arquivo (`TI_COORDENADOR_USER_ID`). Se no futuro quisermos parametrizar por organização, migra-se para uma coluna em `organizations` ou uma configuração — fora do escopo agora.

Nada de mudanças no banco, RLS ou outros fluxos de criação de chamado.
