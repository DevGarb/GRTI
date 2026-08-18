Ajuste visual nos cards de "Equipe Agora" do Painel de TV

Objetivo
- Reduzir a altura dos cards de técnicos/desenvolvedores na seção "Equipe Agora".
- Evitar que os nomes dos membros quebrem em mais de uma linha.

Escopo
- Alterações apenas no frontend, concentradas no componente `src/components/tv/TeamStatusPanel.tsx` e, se necessário, no CSS de tokens do TV.
- Nenhuma alteração de lógica de dados ou backend.

Como será feito
1. Compactar o card de membro (`MemberCardBody`):
   - Reduzir o padding interno de `p-4` para `p-3` (ou `p-2.5`).
   - Diminuir a margem superior entre o nome e os contadores de `mt-4` para `mt-2`.
   - Reduzir ligeiramente o tamanho dos números dos contadores para ganhar vertical space.

2. Evitar quebra de linha do nome:
   - Substituir `break-words` por `whitespace-nowrap` e `truncate` no título do nome.
   - Reduzir o tamanho da fonte do nome para um valor fixo menor (ex: `1.25rem` ou `1.1rem`) para que nomes mais longos ainda caibam no card.
   - Garantir que o badge "Ocioso" nunca empurre o nome para fora do espaço disponível.

3. Ajustes adicionais de espaçamento:
   - Reduzir o gap entre os blocos de contadores (`flex items-end gap-6` → `gap-4` ou `gap-3`).
   - Diminuir/eliminar o texto "chamados sem iniciar" quando não houver, para economizar altura.

4. Validação:
   - Verificar visualmente a seção "Equipe Agora" no preview para confirmar que os nomes não quebram e os cards estão mais compactos.
   - Rodar `bun run build` ao final.

Arquivos envolvidos
- `src/components/tv/TeamStatusPanel.tsx`
- `src/index.css` (apenas se precisar de um token/utilitário extra, improvável)
