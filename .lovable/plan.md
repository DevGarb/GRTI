# Correção: escolher T.I no login redireciona para outra organização

## O que está acontecendo

Na tela "Escolha a organização", ao clicar num card o sistema grava a organização escolhida no perfil do usuário e recarrega a aplicação. Porém essa tela **não atualiza** o marcador de "organização ativa" guardado no navegador (`localStorage` / parâmetro `?org=` na URL).

Depois do reload, o seletor de organização da barra lateral lê esse marcador antigo — que ainda aponta para a organização usada na sessão anterior — considera que houve divergência e **força a troca de volta** para a organização antiga, silenciosamente. Por isso quem escolhe T.I cai em outra organização.

Verificado no código:
- `src/pages/EscolherOrganizacao.tsx` (`choose` e o auto-select de org única) só atualiza o perfil no banco; nenhuma chamada a `persistActiveOrgSlug`.
- `src/components/OrgSwitcher.tsx` (efeito de sincronia inicial) chama `switchOrg(target.id, { silent: true })` sempre que o slug guardado difere da org do perfil — sobrescrevendo a escolha recém-feita.

## Correção

1. **`src/pages/EscolherOrganizacao.tsx`**
   - Em `choose(orgId)`: antes do `window.location.replace("/")`, chamar `persistActiveOrgSlug(slug da org escolhida)` para alinhar `localStorage` e URL com a escolha.
   - Fazer o mesmo no efeito de auto-seleção quando o usuário tem apenas uma organização.

2. **Limpar o marcador ao sair / entrar**
   - No `signOut` (`src/contexts/AuthContext.tsx`), limpar o slug guardado (`persistActiveOrgSlug(null)`), para que uma nova sessão nunca herde a organização do usuário anterior na mesma máquina.

3. **Guarda no `OrgSwitcher`**
   - Só forçar a troca automática a partir do slug guardado quando ele vier da **URL** (`?org=`, link compartilhado). Quando vier apenas do `localStorage` e divergir do perfil, tratar o perfil como fonte da verdade e apenas realinhar o storage — evitando que qualquer resíduo local sobreponha a escolha do usuário no futuro.

## Validação

- Rodar `bun run build`.
- Teste no preview: login com usuário de múltiplas orgs, escolher T.I (`grupo-ramos`) e confirmar que a aplicação abre em T.I; repetir escolhendo outra org e voltar para T.I.
