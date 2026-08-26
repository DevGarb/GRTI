# Scroll no modal de encerramento de sprint

## Problema
O modal "Encerrar sprint" em `/projetos/sprints` não limita sua altura nem possui scroll geral. Em telas menores ou quando a divisão de pontuação possui vários participantes, o conteúdo ultrapassa a viewport e corta a parte inferior (botão "Encerrar sprint", qualidade técnica etc.), conforme o print.

## Solução
Adicionar `max-h-[85vh] overflow-y-auto` no `DialogContent` do modal de encerramento de sprint em `src/pages/projetos/ProjetosSprints.tsx`. O scroll interno da checklist (`max-h-[45vh]`) pode ser removido para evitar scroll duplo — o conteúdo passa a rolar de forma única dentro do modal.

Ajustes visuais mínimos:
- Manter padding e espaçamento existentes.
- Garantir que o `DialogFooter` com os botões continue visível ao final do scroll.

## Escopo
- Arquivo alterado: `src/pages/projetos/ProjetosSprints.tsx`.
- Sem mudanças em regras de negócio, banco, edge functions ou outros modais.
- Validação: `bun run build`.
