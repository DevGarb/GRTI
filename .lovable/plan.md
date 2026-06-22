## Mudanças nos Comentários de Chamados

### 1. Aceitar upload de DOCX e PDF
Atualmente o input de arquivo em `TicketComments.tsx` já lista `.pdf, .doc, .docx, .xls, .xlsx, .txt` no `accept`, mas o bucket de storage `attachments` provavelmente está restringindo por MIME type (apenas imagens passam de fato). Vou:

- Confirmar/ajustar o bucket `attachments` para permitir os MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (e manter os já aceitos).
- Garantir que o `accept` do input cubra `.pdf,.doc,.docx` (já cobre).
- Ajustar o render para mostrar ícone apropriado para PDF/DOCX (atualmente já cai no fallback de "📎 nome do arquivo", o que funciona — manter).

### 2. Editar comentário
Adicionar em cada comentário (apenas para o autor e para admins) um botão "Editar":

- Estado local `editingId` + `editingContent` em `TicketComments.tsx`.
- Botão lápis ao lado do botão de deletar (quando aplicável).
- Ao clicar, troca o texto do comentário por um `<textarea>` com botões "Salvar" / "Cancelar".
- Salvar faz `UPDATE` em `ticket_comments` (`content` + `updated_at`).
- Mostra indicador "(editado)" quando `updated_at > created_at`.

### Backend (migração)
- Garantir coluna `updated_at` em `ticket_comments` (já deve existir — verificar) e trigger de update.
- Política RLS: permitir `UPDATE` em `ticket_comments` quando `user_id = auth.uid()` OU quando o usuário for admin da organização do ticket.
- Atualizar `storage.objects` policies/bucket `attachments` se necessário para liberar PDF/DOCX (provavelmente já permite — confirmar via leitura antes da migração).

### Arquivos afetados
- `src/components/ticket-detail/TicketComments.tsx` — UI de edição + ícones para PDF/DOCX.
- Migração Supabase — política UPDATE em `ticket_comments` (e ajustes no bucket `attachments` se necessário).

### Fora de escopo
- Histórico de edições do comentário.
- Edição de anexos já enviados (apenas o texto será editável).
