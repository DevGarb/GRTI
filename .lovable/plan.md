# Correção: chamado duplicado na abertura

## O que aconteceu (confirmado no banco)

As duas linhas da tela são dois chamados reais, criados com **390 milissegundos de diferença**, pelo mesmo usuário, com o **mesmo número (00275)**:

- 08:57:16.714 — id dbb966ea…
- 08:57:17.104 — id 0fb46027…

Ou seja: sim, o problema é o botão de confirmar abertura. Duplo clique gera dois envios.

## Por que o botão permite isso

No modal de abertura (wizard), a função de confirmação faz uma verificação assíncrona (chamados aguardando aprovação) **antes** de marcar o estado "enviando". Nesse intervalo o botão continua habilitado, então o segundo clique entra na função e cria um segundo chamado. Como o número do chamado é reservado uma única vez na abertura do modal, os dois registros saem com o mesmo número.

## Correção proposta

1. **Trava imediata no clique (frontend)**
   - Marcar "enviando" na primeira linha do handler, antes de qualquer `await`.
   - Adicionar uma trava por referência (`useRef`) que ignora chamadas concorrentes mesmo antes do re-render do React.
   - Aplicar a mesma trava no modal antigo de novo chamado e no fluxo `create-ticket`, que têm o mesmo padrão.

2. **Trava definitiva no banco**
   - Criar índice único em `tickets (organization_id, ticket_number)` para que uma segunda gravação com o mesmo número seja rejeitada, mesmo se o frontend falhar.
   - Antes do índice, verificar se existem outros números duplicados no histórico; se houver, resolvê-los na mesma migração (manter o registro mais antigo).

3. **Limpeza do caso atual**
   - Remover a linha duplicada 0fb46027… (a mais recente), preservando o chamado original e seus anexos/histórico.

## Detalhes técnicos

- Arquivos: `src/components/NewTicketWizardModal.tsx` (handler `handleConfirm`), demais pontos de criação de chamado com o mesmo padrão.
- Migração: `CREATE UNIQUE INDEX ... ON public.tickets (organization_id, ticket_number) WHERE ticket_number IS NOT NULL`.
- Sem mudança de layout ou de fluxo do wizard; apenas comportamento do botão.
- Validação final com `bun run build`.
