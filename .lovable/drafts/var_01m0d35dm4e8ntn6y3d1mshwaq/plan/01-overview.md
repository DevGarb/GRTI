# Nova interface da organização T.I (visual do Login)

Replicar em todas as telas da org T.I (`grupo-ramos`) a mesma linguagem visual já usada em Login e Escolher Organização: fundo escuro com aurora, grid técnico, cartões de vidro (glass), tipografia display + mono-tech, acentos ciano/violeta e microanimações de entrada.

O que muda:

- Um tema escopado novo (`.ti-scope`) ativado apenas quando a org ativa é `grupo-ramos` — nenhuma outra organização (Operacional, GRCheck, Entregas, Oficina) é afetada.
- Shell do app (sidebar + header + área de conteúdo) ganha o fundo aurora, sidebar de vidro e navegação com hairline ciano no item ativo.
- Cartões, tabelas, KPIs, abas, modais e formulários das páginas de T.I passam a usar as superfícies de vidro do novo tema, sem alterar dados, filtros ou regras de negócio.

Nada de lógica muda: mesmas queries, permissões, rotas e comportamentos.
