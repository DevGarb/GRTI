## Objetivo

Reescrever o layout da tela `/asset/:id` (aberta pelo QR Code) seguindo a ordem exata pedida, com destaque para um relógio/contador decrescente da próxima manutenção preventiva.

Bom: o backend (`get-public-asset`) já entrega todos os dados necessários (foto, manutenção, intervalo, histórico, criação). **Nenhuma alteração de banco ou edge function é necessária** — só refatoração visual em `src/pages/AssetPublicView.tsx`.

## Nova ordem visual (de cima para baixo)

```
┌─────────────────────────────────────┐
│  [Logo da organização + nome]       │  cabeçalho discreto
├─────────────────────────────────────┤
│                                     │
│       [Foto do equipamento]         │  hero: foto se houver,
│       (ou ícone do tipo)            │       senão ícone grande
│                                     │
├─────────────────────────────────────┤
│  Nº Patrimônio (OS):  PAT-001234    │  destaque tipográfico
│  Tipo:                Notebook      │
│  Status:              [Ativo]       │  badge colorido
├─────────────────────────────────────┤
│  ⚙ MANUTENÇÃO PREVENTIVA            │
│  ┌─────────────────────────────┐    │
│  │  ⏱  Próxima em  80 dias     │    │  contador grande
│  │     17/07/2026              │    │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━  │    │  barra de progresso
│  │  Última: 27/04/2026         │    │  (verde→amarelo→vermelho)
│  │         por João Silva  
│  │. Itens do Checklist :
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  🕐 Em uso há 1 ano e 3 meses       │
├─────────────────────────────────────┤
│  Marca / Modelo:    Dell Latitude…  │
│  Setor:             TI              │
│  Responsável:       Maria Souza     │
│  Cadastrado em:     27/01/2025      │
├─────────────────────────────────────┤
│  ▼ Linha do tempo (5)               │  colapsável
└─────────────────────────────────────┘
```

&nbsp;

Itens removidos do layout atual: bloco "Histórico de manutenção" colapsável (a info da última preventiva já está no card destacado), Nº Série e Localização (não estavam na lista pedida — manter ocultos por padrão).

## Detalhes do contador de preventiva (destaque)

É o elemento visual principal da tela. Comportamento:

- **Em dia (>15 dias)**: fundo verde claro, texto "Próxima em N dias", barra de progresso verde mostrando % do intervalo já decorrido.
- **Próxima do vencimento (1–15 dias)**: fundo âmbar, ícone de alerta, texto "Próxima em N dias".
- **Vencida (<0)**: fundo vermelho, texto "Atrasada há N dias", barra cheia vermelha.
- **Sem registro**: fundo cinza, texto "Nenhuma preventiva registrada", sem contador.
- **Sem intervalo configurado**: mostra apenas última data, com nota "Intervalo não configurado".

A barra de progresso usa `(intervalo - dias_restantes) / intervalo`, clamped 0–100%.

Cálculo já existe em `computeMaintenanceHealth()` — reutilizar.

## Mudanças no arquivo

**Único arquivo editado**: `src/pages/AssetPublicView.tsx`

1. Reorganizar o JSX do return (~linhas 217–430) na ordem nova.
2. Criar um componente interno `MaintenanceCountdown` que renderiza o card destacado com a barra de progresso.
3. Remover o estado `showHistory` e o `<CollapsibleCard>` de "Histórico de manutenção".
4. Manter o `<CollapsibleCard>` de "Linha do tempo" no final.
5. Reordenar os `<DetailRow>` para: Marca/Modelo → Setor → Responsável → Cadastrado em.
6. Mover Nº Patrimônio + Tipo + Status para um bloco dedicado logo abaixo da foto (não mais em cima dela), com tipografia grande no asset_tag.

Estados, queries, edge function, tipos e helpers (`computeMaintenanceHealth`, `usageLabel`, `shade`, `rgba`) ficam intactos.

## O que NÃO muda

- Edge function `get-public-asset` — sem alterações.
- Banco de dados — sem migrações.
- Cores da organização (`primary_color`) continuam aplicadas.
- Lógica de retry/cooldown e estado de erro continuam iguais.