## Diagnóstico

Hoje a tela `/escolher-organizacao` só aparece quando o usuário tem 2+ vínculos em `user_organizations`. A maioria (incluindo BRUNA.JOPLIN) só está vinculada a `grupo-ramos`, então o login redireciona direto.

## O que será feito

### 1. Vincular todos os usuários existentes às duas organizações
Migration que insere em `user_organizations` o vínculo com `cgps-operacional` para todos os usuários que ainda não têm — preservando os vínculos atuais com `grupo-ramos`.

```sql
INSERT INTO user_organizations (user_id, organization_id)
SELECT p.user_id, (SELECT id FROM organizations WHERE slug = 'cgps-operacional')
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_organizations uo
  WHERE uo.user_id = p.user_id
    AND uo.organization_id = (SELECT id FROM organizations WHERE slug = 'cgps-operacional')
)
ON CONFLICT DO NOTHING;
```

Idem garantindo vínculo com `grupo-ramos` para qualquer usuário órfão.

### 2. Garantir vínculo automático para novos usuários
Atualizar o trigger `handle_new_user` (ou criar trigger complementar) para inserir automaticamente o novo usuário em ambas as organizações em `user_organizations`, além do `profiles`/`user_roles` que já cria.

### 3. Login sempre vai para a tela de escolha
Em `src/pages/Login.tsx`, simplificar o redirect pós-login: se o usuário tem 1+ org, mandar para `/escolher-organizacao` (em vez de exigir 2+). Isso garante que mesmo usuários com uma única vinculação passem pela tela — embora, com a etapa 1, todos terão duas.

Alternativa equivalente: manter a regra "1 org = pula tela" mas, como todos passarão a ter 2, o efeito é o mesmo. Vou pelo caminho mais robusto: **sempre mostrar** quando houver mais de 1 org disponível (regra atual), e deixar o auto-vínculo das etapas 1+2 garantir que isso aconteça para todos.

### 4. Visibilidade de menus por organização (sem mudança)
A lógica de menus por `orgSlugs` em `menuItems.ts` já filtra o que cada org vê — então BRUNA, ao escolher "grupo-ramos", verá apenas o helpdesk; ao escolher "cgps-operacional", verá Entregas/Oficina/Manutenção.

## Resumo técnico

- **Migration**: backfill de `user_organizations` + atualização do trigger `handle_new_user` para inserir nas duas orgs.
- **Frontend**: ajuste mínimo (ou nenhum) em `Login.tsx` — a tela de escolha já existe e funciona.
- Sem mudanças de RLS, roles ou UI da tela de escolha.

## Observação

Se algum usuário no futuro precisar ficar restrito a apenas uma organização, isso será feito removendo manualmente o vínculo em `user_organizations` (ou via uma futura tela de admin).