# Aviso por email de nova OM sem responsável

Sempre que uma ordem de manutenção predial for criada sem responsável (coluna "Sem atribuição" do Kanban), enviar um email automático para ger.operacional@cearagps.com.br.

## Conteúdo do email
- Número da ordem
- Título
- Categoria
- Prioridade
- Sede (nome da sede vinculada)
- Data/hora de abertura e link para o módulo de Manutenção Predial

## Como vai funcionar
1. Nova Edge Function `notify-maint-order` recebe o registro da ordem recém-criada.
2. A função busca o nome da sede e monta um email HTML simples com a identidade do sistema.
3. O envio usa o Resend com a API Key fornecida como secret.
4. Um gatilho no banco (webhook de INSERT na tabela de ordens de manutenção) chama a função somente quando o responsável está vazio (`assigned_technician_id` nulo e `responsible` vazio).

## Detalhes técnicos
- Secret necessário: `RESEND_API_KEY` (solicitado via add_secret antes da implementação). Se o Resend for conectado como connector, o envio passa pelo gateway; caso contrário, chamada direta à API do Resend.
- Remetente: precisa de um domínio verificado no Resend (ex.: `manutencao@cearagps.com.br`). Sem domínio verificado, só é possível testar com `onboarding@resend.dev`, que entrega apenas ao dono da conta Resend.
- Edge function `supabase/functions/notify-maint-order/index.ts`: valida o payload com Zod, ignora se houver responsável, busca `op_sites.name`, envia via Resend e retorna o status real do provedor em caso de erro.
- Migration: função `pg_net` + trigger `AFTER INSERT` em `op_maintenance_orders`, com `WHEN (NEW.assigned_technician_id IS NULL AND coalesce(NEW.responsible,'') = '')`, fazendo POST para a URL da edge function com o payload da ordem.
- Sem alterações de UI; nenhum fluxo existente do Kanban é modificado.

## Pendências para você
- Confirmar o domínio verificado no Resend e o endereço remetente desejado.
- Fornecer a `RESEND_API_KEY` quando solicitada.
