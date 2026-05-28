## Objetivo

Notificar staff (técnico/dev/admin) em tempo real quando um novo chamado for aberto na sua organização, com:
- Título da aba do navegador piscando alternando entre "🔔 Novo chamado!" e o título atual
- Sinal sonoro (beep gerado via Web Audio API — sem precisar de arquivo)
- Funciona globalmente em qualquer página do sistema

## Como vai funcionar

1. Novo hook `useNewTicketNotifier` montado uma vez no `AppLayout`.
2. Ele assina via Supabase Realtime a tabela `tickets` filtrando `organization_id = <org do usuário>` e evento `INSERT`.
3. Quando chega um INSERT:
   - Se o criador for o próprio usuário, ignora.
   - Toca beep curto (~2 bips de 880Hz) via Web Audio API.
   - Mostra toast "Novo chamado aberto: <título>".
   - Inicia loop que alterna `document.title` entre "🔔 Novo chamado!" e o título original a cada 1s.
4. O piscar para quando:
   - A aba ganha foco (`visibilitychange` → visible), ou
   - O usuário entra na rota `/chamados-abertos`.
5. Restrito a `tecnico | desenvolvedor | admin | super_admin` (solicitantes não recebem).

## Pré-requisito SQL

Habilitar realtime na tabela tickets (uma migration):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
```
(Se já estiverem habilitados, o ADD é idempotente via verificação prévia.)

## Arquivos

- **Novo** `src/hooks/useNewTicketNotifier.ts` — subscription realtime, beep, title flasher.
- **Editado** `src/components/AppLayout.tsx` — chamar `useNewTicketNotifier()` uma vez.
- **Nova migration** — habilitar realtime em `public.tickets`.

## Fora do escopo

- Push notifications nativas do navegador (Notification API).
- Persistência das notificações (histórico).
- Som customizado por upload (fica como melhoria futura).
- Mudanças no fluxo de criação/atribuição de chamados.