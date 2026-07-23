
## Objetivo

Hoje, na tela **Usuários** do GRCHECK, o admin só consegue **criar** um novo usuário. Se a pessoa já existe em outra organização (ex.: já tem conta no Helpdesk), o admin acaba criando uma conta duplicada. Vamos permitir **vincular um usuário já existente** à organização atual, ao invés de criar de novo.

## Onde entra na tela

Ao lado dos botões atuais **"Importar CSV"** e **"Novo Usuário"** no header de `src/pages/Usuarios.tsx`, adicionar um terceiro botão:

- **"Vincular Existente"** (ícone `UserPlus2` ou `Link2` do lucide-react)
- Visível para admin (mesma regra dos outros botões).

## Novo modal: `LinkExistingUserModal`

Novo arquivo `src/components/usuarios/LinkExistingUserModal.tsx`, aberto pelo botão acima.

Conteúdo:

1. **Campo de busca** (input com ícone de lupa) que filtra por nome, username, email ou CPF.
2. **Lista de resultados** — usuários que **ainda não estão vinculados** à organização atual (`adminOrgId`). Cada linha mostra: nome, username, email, e um "chip" com as organizações às quais o usuário já pertence (para o admin ter certeza que é a pessoa certa).
3. **Seletor de papel** na linha (Colaborador / Técnico / Desenvolvedor / Administrador) — mesmos papéis do `LinkOrgModal.tsx`.
4. Botão **"Vincular"** por linha (ou seleção múltipla + botão único no rodapé — ver "Detalhes técnicos").
5. Ao confirmar: insere em `user_organizations` e `user_organization_roles` para a org atual, invalida `["admin-users"]` e fecha o modal com toast de sucesso.

## Regras / edge cases

- Só lista usuários que **não** têm vínculo com a org atual (evita "vincular" quem já é).
- Se o admin não for super_admin, ele só pode vincular à **própria organização** (`adminOrgId`) — igual à restrição já documentada no `LinkOrgModal`.
- Não muda senha, nome ou dados do usuário; apenas cria o vínculo + papel.
- Nada de mudança de schema — as tabelas `user_organizations` e `user_organization_roles` já suportam múltiplos vínculos por usuário.

## Detalhes técnicos

- Busca inicial: `supabase.from("profiles").select("user_id, full_name, username, email, cpf")` paginada (padrão de 1000 já usado no arquivo). Depois cruzar com `user_organizations` do org atual para remover os já vinculados. Para o chip de "organizações atuais", buscar `user_organizations` + `organizations(name, slug)` dos user_ids exibidos.
- Filtro client-side pelo termo de busca (lista de profiles não é enorme e mantém UX responsiva).
- Inserção: reutilizar exatamente o padrão do `LinkOrgModal.tsx` (insert em `user_organizations` seguido de insert em `user_organization_roles`).
- Sugestão de UX: **seleção múltipla** (checkbox por linha + dropdown de papel default no rodapé), para o admin conseguir vincular vários de uma vez. Se preferir simples (1 por vez), também está OK — me diga na revisão.

## Escopo fora deste plano

- Não altera `LinkOrgModal` (continua sendo o fluxo inverso: partindo de um usuário, escolher orgs).
- Não mexe em permissões/menus — vínculo entra com papel padrão; os menus seguem o preset da org normalmente.
- Não altera outras telas (Helpdesk etc.); o botão fica disponível em qualquer org, não só GRCHECK, pois o problema é o mesmo.
