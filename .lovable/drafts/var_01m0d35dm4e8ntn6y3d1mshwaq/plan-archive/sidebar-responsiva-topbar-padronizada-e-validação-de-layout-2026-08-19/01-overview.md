# Sidebar responsiva, topbar padronizada e validação de layout — org T.I

Três frentes, todas restritas ao escopo visual da organização T.I (`grupo-ramos`). Nenhuma regra de negócio, query ou permissão muda.

## 1. Sidebar colapsável com estado persistente

Hoje a sidebar tem largura fixa de 240px, é `fixed` no mobile e só abre por um botão hambúrguer, sem memória de estado.

- **Mobile (< 1024px):** vira gaveta com overlay, fecha ao navegar, ao clicar fora e com `Esc`; o scroll do corpo trava enquanto aberta.
- **Desktop (>= 1024px):** ganha alternância entre expandida (240px) e mini-rail (72px, só ícones com tooltip no hover, que já existe).
- **Persistência:** a preferência de colapso do desktop fica em `localStorage` na chave `ti-sidebar-collapsed`, lida na primeira renderização para não haver "pulo" de layout. O estado do mobile nunca é persistido (sempre inicia fechada).
- O comportamento das outras organizações fica exatamente como está: o colapso do desktop só aparece na T.I.

## 2. Topbar e títulos iguais aos do login

O login usa uma linguagem específica: sobretítulo em mono com tracking largo, título com gradiente sky → cyan → violet, subtítulo leve em cinza-claro, tudo sobre superfície de vidro.

- Novo componente `TiPageHeader` (sobretítulo opcional, título com gradiente, descrição e área de ações à direita) reaproveitando os mesmos tokens já definidos em `ti.css`.
- A topbar da T.I passa a ter: botão de menu (mobile), logo/nome da org, e o bloco de ações (notificações, alerta de teste) alinhado à direita, com o mesmo vidro + hairline do login.
- As páginas da T.I trocam seus cabeçalhos `<h1>` avulsos por `TiPageHeader`, mantendo textos e botões atuais.

## 3. Validação automática de layout

- **Testes de componente (Vitest + Testing Library):** a sidebar da T.I inicia colapsada quando `localStorage` diz isso; alternar persiste o valor; a gaveta mobile fecha com `Esc` e ao navegar; `TiPageHeader` renderiza título, sobretítulo e ações.
- **Checagem visual (script Playwright fora do build):** roda o app local em 1280px e 390px, aplica o escopo T.I, e valida invariantes — sem barra de rolagem horizontal, topbar presente e visível, sidebar oculta no mobile e visível no desktop, contraste do título de página acima do mínimo — salvando capturas para inspeção.
