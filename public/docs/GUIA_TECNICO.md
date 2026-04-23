# 🔧 Guia do Técnico — In Demands

## Índice
1. [Visão Geral](#visão-geral)
2. [Acesso e Login](#acesso-e-login)
3. [Chamados](#chamados)
4. [SLA em Horas Úteis](#sla-em-horas-úteis)
5. [Chamados Abertos — Fila Geral](#chamados-abertos--fila-geral)
6. [Atendendo um Chamado](#atendendo-um-chamado)
7. [Fechando e Avaliando um Chamado](#fechando-e-avaliando-um-chamado)
8. [Minhas Metas](#minhas-metas)
9. [Manutenção Preventiva](#manutenção-preventiva)
10. [Configurações](#configurações)

---

## 1. Visão Geral

Como **Técnico** no In Demands, seu papel principal é **atender e resolver chamados** abertos pelos solicitantes. Você tem acesso a:

- Visualizar e gerenciar chamados atribuídos a você
- Acompanhar o SLA de cada chamado em horas úteis
- Pegar chamados disponíveis na fila geral
- Fechar chamados e atribuir pontuação via categoria de serviço
- Acompanhar suas metas mensais com gráfico de desempenho
- Registrar manutenções preventivas em equipamentos

### Menu disponível para o Técnico
| Menu | Descrição |
|------|-----------|
| Chamados | Seus chamados atribuídos e fila geral |
| Chamados Abertos | Fila de chamados disponíveis para assumir |
| Metas | Seu card de metas e desempenho mensal |
| Preventivas | Registro de manutenções preventivas |
| Configurações | Preferências pessoais |

---

## 2. Acesso e Login

1. Acesse a URL da plataforma fornecida pelo seu administrador
2. Insira seu **e-mail** e **senha**
3. Clique em **Entrar**

### Dicas
- Use o botão 🌙/☀️ no rodapé do menu para alternar entre **modo claro** e **modo escuro**
- Para sair, clique no botão de **logout** (ícone de porta) no rodapé do menu

---

## 3. Chamados

### Acessar: Menu → **Chamados**

### Visão geral da tela
A tela exibe contadores rápidos do mês selecionado:
- **Total**: Todos os chamados no período
- **Abertos**: Aguardando atendimento
- **Em Andamento**: Em atendimento
- **Fechados**: Resolvidos

### Card de Metas
Logo abaixo dos contadores, se você tiver metas definidas pelo administrador para o mês atual, aparece automaticamente o **seu card de desempenho** com progresso em tempo real.

### Filtros
- **Busca por texto**: Título, descrição ou solicitante
- **Status**: Todos ou um status específico
- **Mês/Ano**: Filtra por data de criação do chamado
- **Retrabalho**: Exibe apenas chamados com retrabalho

### Visualização
Alterne entre **Lista** (agrupada por técnico) e **Kanban** (por status) usando os botões no canto superior direito.

### Tabela de Chamados
Cada linha da tabela mostra:
- **Título** (com badge laranja indicando retrabalho, se houver)
- **Solicitante**
- **Status** (badge colorido)
- **Categoria** do serviço
- **Data** de criação
- **Tempo SLA** — horas úteis decorridas com alerta de cor
- **Prioridade**
- **Pontuação** atribuída (quando fechado e avaliado)

---

## 4. SLA em Horas Úteis

O sistema calcula o tempo de cada chamado usando apenas **horas úteis** (segunda a sexta, 08h–18h). Fins de semana e fora do horário comercial **não são contados**.

### Exemplos
- Chamado aberto sexta às 17h → segunda às 09h = **2h** úteis (não 40h)
- Chamado aberto segunda às 08h → terça às 10h = **12h** úteis

### Indicador de cor na coluna Tempo SLA

| Cor | Prioridade Urgente | Prioridade Alta | Prioridade Média | Prioridade Baixa |
|-----|-------------------|-----------------|------------------|-----------------|
| 🟢 Verde | < 4h | < 8h | < 16h | < 32h |
| 🟡 Amarelo | 4h – 8h | 8h – 16h | 16h – 32h | 32h – 80h |
| 🔴 Vermelho | > 8h | > 16h | > 32h | > 80h |
| Cinza | Fechado | Fechado | Fechado | Fechado |

Chamados fechados exibem o **tempo total de resolução** em cinza, sem alerta.

---

## 5. Chamados Abertos — Fila Geral

### Acessar: Menu → **Chamados Abertos**

Esta tela exibe chamados disponíveis para assumir, organizados em duas seções:

**Com SLA expirado** (borda vermelha):
- Chamados que ultrapassaram o prazo de atendimento
- Clique em **"Atribuir para mim"** para assumir o chamado imediatamente

**Abertos** (borda âmbar):
- Chamados recentemente abertos sem técnico atribuído
- Clique em **"Atribuir para mim"** para assumir

Ao assumir um chamado, ele é atribuído ao seu usuário e o status muda automaticamente para **Em Andamento**.

---

## 6. Atendendo um Chamado

1. Na lista de chamados, **clique no chamado** que deseja atender
2. O modal de detalhes abre com todas as informações
3. Use o **dropdown de Status** para atualizar o andamento:

| Status | Quando usar |
|--------|-------------|
| **Aberto** | Chamado recém-criado, ainda não iniciado |
| **Em Andamento** | Você começou a trabalhar no chamado |
| **Aguardando Aprovação** | Solução aplicada, aguardando confirmação |
| **Aprovado** | Solicitante confirmou a resolução |
| **Fechado** | Chamado encerrado definitivamente |

### Informações visíveis no chamado
- Solicitante e técnico responsável
- Descrição completa e anexos
- Prioridade, tipo e data de criação
- Histórico de alterações de status

---

## 7. Fechando e Avaliando um Chamado

### Fluxo de Fechamento
1. Abra o chamado clicando nele
2. Clique em **"Fechar e Avaliar Chamado"**
3. O status muda automaticamente para **Fechado**
4. Preencha a avaliação:

#### a) Categoria do Serviço (obrigatória para pontuar)
- Navegue na árvore **Macro → Sistema → Item**
- Selecione o **item** que melhor descreve o serviço realizado
- Cada item tem uma **pontuação em pontos** configurada pelo admin
- A pontuação atribuída aparece em um card âmbar: *"Pontuação atribuída: X pts"*
- Clique em **"Alterar"** se quiser trocar a categoria antes de enviar

#### b) Nota de Satisfação (obrigatória)
- Clique nas **estrelas** de 1 a 5 para avaliar a qualidade do atendimento
- 1 ⭐ = Muito ruim | 5 ⭐ = Excelente

#### c) Comentário (opcional)
- Observações sobre o atendimento realizado

5. Clique em **"Enviar Avaliação"** para confirmar

> 💡 Se o chamado já estiver fechado e avaliado, o botão muda para **"Alterar Avaliação"** — você pode rever a categoria ou nota sem reabrir o chamado.

### Como a pontuação funciona
- A pontuação vem do **score da micro-categoria** selecionada
- É registrada uma única vez por chamado (atualizável)
- Retrabalhos penalizam a nota de satisfação (−1 estrela por retrabalho, mínimo 1)
- Tudo é contabilizado nas suas **metas mensais**

---

## 8. Minhas Metas

### Acessar: Menu → **Metas**

Esta tela exibe exclusivamente o **seu card de desempenho** com as metas definidas pelo administrador para o mês selecionado.

### O que aparece no card

**Cabeçalho:**
- Suas iniciais e nome
- `X/Y metas atingidas` no mês
- Percentual global de atingimento (colorido por desempenho)

**Gráfico Radar** (quando há 3 ou mais métricas):
- Visualização em teia mostrando seu desempenho relativo em cada métrica

**Sub-cards por métrica:**

| Indicador | Cor | Significado |
|-----------|-----|-------------|
| ✓ Verde | ≥ 100% | Meta atingida |
| ⚠ Âmbar | 50–99% | Em andamento |
| ⚠ Vermelho | < 50% | Atenção necessária |

Cada sub-card mostra: **valor atual**, **meta definida** e **barra de progresso**.

### Seletor de período
Use os dropdowns de **mês** e **ano** no canto superior direito para consultar metas de períodos anteriores.

> Se o administrador ainda não definiu metas para você, a tela exibirá a mensagem *"Nenhuma meta individual definida para este período"*.

---

## 9. Manutenção Preventiva

### Acessar: Menu → **Preventivas**

Registre e acompanhe manutenções preventivas em equipamentos.

### Alertas automáticos

**Vencidas** (banner vermelho):
- Equipamentos que passaram do intervalo configurado
- Exibe há quantos dias está vencida
- Clique em **"Nova Preventiva"** para registrar imediatamente

**Próximas a vencer** (banner âmbar):
- Equipamentos com até **15 dias** para o prazo
- Exibe quantos dias restam
- Clique em **"Agendar"** para registrar antecipadamente

### Aba Equipamentos
Cada card de equipamento mostra um **badge de status**:
- 🟢 Verde: `X dias restantes`
- 🟡 Âmbar: `Vence em Xd`
- 🔴 Vermelho: `Vencida há Xd`

### Registrar uma Preventiva
1. Clique em **"Nova Preventiva"**
2. Preencha:
   - **Tipo de equipamento**: Desktop, Notebook, Impressora, Servidor
   - **Patrimônio**: Código do ativo (asset tag)
   - **Data de execução**: Quando a manutenção foi realizada
   - **Checklist**: Itens verificados
   - **Observações**: Notas adicionais
3. Salve — o contador reinicia automaticamente a partir da data registrada

---

## 10. Configurações

### Acessar: Menu → **Configurações**

Ajuste suas preferências pessoais:
- **Tema**: Modo claro ou escuro (também disponível no rodapé do menu)
- **Informações do perfil**: Nome e dados pessoais

---

## Resumo Rápido — Fluxo de Trabalho

```
1. Login → Chamados
2. Ver chamados atribuídos (e card de metas, se configurado)
3. Clicar no chamado → Alterar status para "Em Andamento"
4. Resolver o problema
5. Clicar em "Fechar e Avaliar Chamado"
6. Selecionar a micro-categoria de serviço (pontuação)
7. Dar nota de satisfação (estrelas)
8. Enviar Avaliação ✅
9. Acompanhar desempenho em Menu → Metas
```

---

## Precisa de Ajuda?

Entre em contato com o **Administrador** da sua organização.

---

*Documentação atualizada em Abril de 2026*
