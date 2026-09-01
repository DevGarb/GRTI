# Nova organização "Grupo Ramos - Gestão de Processos" (link externo)

## Objetivo

Adicionar na tela "Escolha a organização" um card para **Grupo Ramos - Gestão de Processos** que não é um ambiente do GRTI: ao clicar, abre `https://processosgr.lovable.app/` em **nova aba**, mantendo o GRTI na tela de escolha.

## Como vai funcionar

- O card aparece junto dos demais (T.I, Operacional, GRCheck), com o mesmo visual, mas com um selo discreto "Link externo" e ícone de seta de saída.
- Clique abre o site em nova aba (`target="_blank"`, `rel="noopener noreferrer"`). O perfil do usuário **não** é alterado — nenhuma troca de organização acontece.
- Visível para todos que acessarem a tela de escolha (usuários autenticados no GRTI), conforme definido.
- Se o usuário tiver apenas 1 organização real vinculada, o auto-redirecionamento atual continua valendo — a tela de escolha só aparece quando há mais de uma opção. Nesse caso o card externo fica acessível na tela de escolha quando ela é exibida.

## Configurações de acesso

Na tela de Usuários, no modal de vínculo de organizações, a nova organização passa a aparecer na lista com um controle de liberação de visualização (marcar/desmarcar), para que futuramente ela possa ser restrita por usuário. Por padrão, todos ficam liberados.

## Detalhes técnicos

1. **Registro da organização externa**
   - Criar a organização no banco com slug `gestao-processos` e nome "Grupo Ramos - Gestão de Processos", marcando-a como externa (nova coluna `external_url text` em `organizations`, nula para as demais).
   - Vincular todos os usuários existentes em `user_organizations` a essa organização para que apareça para todos; novos usuários recebem o vínculo pelo mesmo fluxo já existente de cadastro/vínculo.

2. **`src/hooks/useUserOrganizations.ts`**
   - Passar a selecionar também `external_url`.
   - `switchToOrg` nunca é chamado para orgs externas.

3. **`src/pages/EscolherOrganizacao.tsx`**
   - Se `org.external_url` estiver preenchido, renderizar o card como âncora que abre em nova aba, com selo "Link externo"; caso contrário, mantém o comportamento atual (`choose`).
   - No auto-select de organização única, ignorar organizações externas ao contar as opções.

4. **`src/components/OrgSwitcher.tsx`**
   - Filtrar organizações externas do seletor da barra lateral (não faz sentido "trocar" para um site externo).

5. **`src/components/usuarios/LinkOrgModal.tsx`**
   - A organização externa aparece na lista com o mesmo checkbox de vínculo, sem seletor de papel (não há papéis dentro do site externo).

## Validação

- `bun run build`.
- Preview: entrar com usuário multi-org, conferir o card na tela de escolha, clicar e confirmar abertura em nova aba sem trocar a organização ativa; conferir que o seletor da sidebar não lista a organização externa.
