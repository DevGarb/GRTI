# Trocar chave do Resend + novo aviso de Entregas

## Contexto
- Uma única chave (`RESEND_API_KEY`) alimenta 4 funções de notificação: Oficina (análise/triagem, supervisor, agendamento) e Manutenção Predial (OM sem responsável).
- Os disparos são gatilhos no banco (`notify_*` → `net.http_post` → funções `notify-*`).
- Usuário forneceu a nova chave da outra conta Resend; remetente/destinatário: `notificacaoapoiocearagps@gmail.com`; módulo de Entregas terá aviso novo (novo pedido pendente).

## Passos

1. **Substituir a chave do Resend** — `update_secret` em `RESEND_API_KEY` (abre formulário seguro para o usuário colar a chave nova). Vale para todos os módulos ("trocar para tudo").

2. **Atualizar destinatário e remetente** nas 4 funções existentes (`notify-maint-order`, `notify-oficina-analise`, `notify-supervisor-alert`, `notify-oficina-agendamento`):
   - `TO_EMAIL` → `notificacaoapoiocearagps@gmail.com`
   - `FROM_EMAIL` → manter `GRTI Manutenção/Oficina <onboarding@resend.dev>` (entrega ao dono da conta Resend nova). Se um domínio próprio for verificado depois, trocamos o remetente por `avisos@dominio.com`.

3. **Nova função `notify-entregas`** (`supabase/functions/notify-entregas/index.ts`):
   - Igual às demais: recebe `record`, ignora se `status !== 'Pendente'` ou se já tem `driver_id`.
   - Consulta nome da empresa (`op_companies`) e do solicitante.
   - Envia email: número/tipo, categoria, período, data agendada, endereço, contato, solicitante — botão para abrir `/op/entregas`.
   - Assunto: `[Entregas] Novo pedido pendente - ...`.

4. **Gatilho no banco** (migration): função `notify_entregas_request()` (INSERT em `op_deliveries` com `status = 'Pendente'`) → `net.http_post` para `/functions/v1/notify-entregas` + trigger `trg_notify_entregas` na `op_deliveries`.

5. **Deploy** das 5 edge functions (`supabase--deploy_edge_functions`).

6. **Validação**:
   - Chamar `notify-entregas` com payload de teste e confirmar envio (resposta `success`) e chegada do email.
   - `bun run build` no final.

## Notas
- Sem mudanças de schema/RLS (só função + trigger via migration).
- O email sai de `onboarding@resend.dev` e só chega ao dono da conta Resend nova (neste caso, o próprio email informado) — até a verificação de um domínio próprio.
