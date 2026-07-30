# Redesign visual do GRCheck

Refinamento puramente visual das telas do módulo de checklists (GRCheck) e do shell (sidebar/topo) quando a organização GRCheck está ativa. Nenhuma lógica, query, hook, rota ou regra de negócio é alterada.

## Direção visual

- Paleta: azul institucional atual, refinado — superfícies `#f7f9fb` / `#e6ecf2`, primário `#0b4d8c`, acento interativo `#1f7ae0`. Tudo via tokens HSL, sem cores fixas em componentes.
- Densidade equilibrada: respiro maior nos cabeçalhos e KPIs, listas ainda compactas para uso operacional.
- Cantos suaves, sombras discretas em duas intensidades (repouso / hover), transições de 150–200ms.
- Tipografia: escala consistente (título de página, rótulo de seção em caixa alta discreta, corpo 14px, meta 12px) com contraste AA.

## O que muda em cada tela

- **Painel (`ChkDashboard`)**: cabeçalho com ícone em "pill", KPIs em cards com rótulo, valor e faixa de acento por tom (total / concluídas / pendentes / atrasadas); score médio vira card de destaque com barra de progresso; cards de navegação com ícone em círculo, seta de avanço e hover elevado.
- **Meus Checklists (`ChkMinhas`)** e **Execuções (`ChkExecucoes`)**: listas com linhas mais legíveis (título, metadados com ícones em vez de separadores "·"), badges de status padronizados por token, chips de filtro com estado ativo mais claro, campos de data estilizados, estados vazios com ícone e texto orientativo, skeletons no lugar do spinner.
- **Executar (`ChkExecutar`)**: cabeçalho fixo com progresso (barra + contadores), itens em cards com área de toque maior no mobile, botões de OK / N/A / foto mais claros, indicador de "salvo automaticamente" discreto, rodapé de ação fixo no mobile.
- **Modelos, Atribuições, Empresas, Setores, Relatórios, Importar**: cabeçalho de página padronizado, tabelas com cabeçalho fixo, zebra sutil e hover de linha, formulários e diálogos com espaçamento e alinhamento consistentes, botões com hierarquia primário/secundário/destrutivo.
- **Como Funciona**: timeline com melhor ritmo vertical e numeração destacada (conteúdo inalterado).
- **Sidebar/topo (apenas org GRCheck)**: ajuste de contraste dos itens, item ativo com indicador lateral, agrupamento visual mais claro, cabeçalho com respiro e alvos de toque maiores no mobile.

## Responsividade e acessibilidade

- Grids: 1 coluna no mobile, 2 no tablet, 3–4 no desktop.
- Tabelas rolam horizontalmente com sombra de borda; nas telas menores viram cartões empilhados onde faz sentido.
- Foco visível em todos os elementos interativos, `aria-label` em botões só de ícone, contraste mínimo AA, respeito a `prefers-reduced-motion`.

## Detalhes técnicos

- Novos tokens em `src/index.css` sob um escopo `.chk-scope` (mesmo padrão já usado por `src/pages/op/cearagps.css`), sem tocar nos tokens globais de outros módulos.
- Componentes de apresentação reutilizáveis novos em `src/components/checklists/` (cabeçalho de página, card de KPI, badge de status, estado vazio, skeleton) — apenas JSX/estilo, sem estado de dados.
- Alterações restritas a `className`/markup nos arquivos de `src/pages/checklists/*`; hooks (`useChecklists`), chamadas ao backend, nomes de funções e props permanecem idênticos.
- Ajuste da sidebar condicionado ao slug `grcheck` já disponível em `AppLayout`.
- Ao final: `bun run build` e conferência visual das telas no preview.
