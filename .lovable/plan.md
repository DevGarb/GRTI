## Remover role global "Solicitante"

Hoje, ao criar usuário, é inserido um registro em `user_roles` (tabela global) com role `solicitante`, além das roles por organização em `user_organization_roles`. Isso gera o badge "Solicitante · Global" duplicado, sem utilidade (acesso real é resolvido sempre por org).

### O que muda

1. **Migration**
   - `DELETE FROM public.user_roles WHERE role = 'solicitante'` (limpa os 33 registros existentes).
   - Atualizar `handle_new_user()` para **não** mais inserir `solicitante` em `user_roles`. A função continua criando o profile, vinculando o usuário às orgs (`user_organizations`) e atribuindo `solicitante` por org em `user_organization_roles`.
   - `user_roles` passa a guardar apenas roles realmente globais (`super_admin` e, eventualmente, outras roles globais legadas como `admin`/`tecnico`/`desenvolvedor` que ficam intocadas — fora do escopo desta limpeza).

2. **Edge functions `create-user` / `update-user`**
   - Remover qualquer insert de `solicitante` em `user_roles`. Roles globais só devem ser criadas para `super_admin`. Roles por org continuam sendo gravadas em `user_organization_roles`.

3. **Frontend (`SuperAdmin.tsx`)**
   - Sem mudança funcional necessária — após a limpeza, o badge "Solicitante · Global" simplesmente deixa de aparecer.
   - (Opcional) Filtrar defensivamente `user_roles` para ignorar `solicitante` global, caso reste algum registro futuro.

4. **`AuthContext.fetchRoles`**
   - Mantém o union de globais + org. Como `solicitante` deixa de existir como global, o efeito é automático.

### Fora do escopo
- Não mexer em `super_admin` (precisa continuar global).
- Não migrar/remover `admin`, `tecnico`, `desenvolvedor` globais existentes — esses casos podem ser tratados depois se você quiser também forçar tudo a ser por-org.
- Não alterar políticas RLS (todas relevantes já usam `has_role` → `current_org_role`, que lê `user_organization_roles`).

### Verificação pós-deploy
- Tela Super Admin não deve mais exibir badge "Solicitante · Global".
- Criar um novo usuário e confirmar que ele recebe somente "Solicitante · Grupo Ramos" e "Solicitante · OPERACIONAL".