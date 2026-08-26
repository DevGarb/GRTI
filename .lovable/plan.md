# Painel de TV: "Acesso negado" intermitente

## O que está acontecendo (diagnóstico confirmado)

Não é problema de token nem de permissão. Nos logs da função `tv-dashboard` aparecem, várias vezes por minuto:

- `ERROR CPU Time exceeded`
- respostas com status **546** (função abortada), intercaladas com respostas 200
- tempo de execução das chamadas bem-sucedidas: **11 a 14 segundos** (o normal seria menos de 1s)

Quando a função estoura o limite de CPU, o navegador recebe um erro HTTP. E a tela do painel (`src/pages/TvDashboard.tsx`) mostra **"Acesso negado — Token inválido ou organização inexistente"** para *qualquer* erro, mesmo quando o token está correto. Na próxima atualização automática (a cada 60s) a chamada dá certo e a tela "reconecta" — exatamente o comportamento relatado.

## Por que começou agora

Duas mudanças recentes se somaram:

1. A correção de fuso horário introduziu `supabase/functions/tv-dashboard/tz.ts`, onde cada operação de data cria um `Intl.DateTimeFormat` novo.
2. A função calcula o tempo útil (`calcBusinessMinutes`) **dia a dia, em laço**, para cada chamado aberto — e cada dia do laço faz várias dessas conversões de fuso.

Hoje a organização tem **80 chamados em aberto**, sendo o mais antigo de **28/05** (cerca de 90 dias). Isso gera dezenas de milhares de conversões de fuso por requisição, repetidas em três pontos diferentes da função. Antes, com menos chamados antigos e sem os helpers de fuso, o custo era baixo; o crescimento do backlog empurrou a função para além do limite de CPU.

## Correção proposta

1. **Cachear as conversões de fuso** em `tz.ts`: reutilizar instâncias de `Intl.DateTimeFormat` (uma por formato) em vez de criar uma nova a cada chamada, e memoizar o offset por dia.
2. **Reescrever `calcBusinessMinutes`** para não iterar dia a dia com conversões: calcular por diferença de dias/semanas úteis usando aritmética simples, mantendo o mesmo resultado (08:00–18:00, seg–sex, horário de Brasília).
3. **Reaproveitar cálculos**: hoje o tempo útil é recalculado para os mesmos chamados no laço de KPIs e novamente nas listas de "Aberto" e "Em Andamento" — calcular uma vez e reusar.
4. **Mensagem de erro honesta no painel**: em `TvDashboard.tsx`, mostrar "Acesso negado" apenas quando a resposta for 401/404; para 5xx/546 mostrar "Falha temporária ao carregar — tentando de novo" com re-tentativa automática, em vez de sugerir token inválido.

## Validação

- Redeploy da função e medição do tempo de resposta (meta: abaixo de 1s).
- Conferir os logs para confirmar ausência de `CPU Time exceeded` e de status 546.
- Comparar os KPIs antes/depois para garantir que os números não mudaram.
