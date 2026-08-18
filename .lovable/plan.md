Renomear label "Em Andamento" → "Andamento" nos cards da Equipe Agora

Objetivo
- Evitar a quebra de linha do rótulo "Em Andamento" nos cards de técnicos/desenvolvedores do Painel de TV, trocando-o por "Andamento".

Escopo
- Alteração apenas no texto do rótulo exibido no card, no frontend.
- Nenhuma mudança de lógica de dados, backend ou status do chamado.

Como será feito
1. Localizar o rótulo no componente `src/components/tv/TeamStatusPanel.tsx`.
2. Substituir `Em Andamento` por `Andamento` no texto do card (mantendo o ícone e a cor).
3. Manter o tooltip / HoverCard com o label "Em andamento" (ou ajustar para "Andamento" também, se desejado) para consistência visual.
4. Rodar `bun run build` ao final para garantir que não há erros de compilação.

Arquivos envolvidos
- `src/components/tv/TeamStatusPanel.tsx`

Sobre a dúvida de "chamados sem iniciar"
- O campo `unstarted` exibido no badge/texto vermelho é calculado pela edge function `tv-dashboard`.
- Ele conta, para cada técnico/desenvolvedor, os chamados onde `assigned_to = id do usuário` e `status = "Aberto"`.
- Ou seja: são chamados já atribuídos ao técnico, mas que ainda não foram iniciados (status diferente de "Em Andamento" / "Fechado" / "Aprovado" / "Aguardando Aprovação").
- No exemplo, Felipe Augusto tem 2 chamados atribuídos a ele que ainda estão em "Aberto" e, por isso, aparecem como "2 chamados sem iniciar".
