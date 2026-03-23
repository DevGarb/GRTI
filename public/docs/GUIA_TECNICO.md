# 🔧 Guia do Técnico — In Demands

## Índice
1. [Visão Geral](#visão-geral)
2. [Acesso e Login](#acesso-e-login)
3. [Dashboard](#dashboard)
4. [Gerenciando Chamados](#gerenciando-chamados)
5. [Atendendo um Chamado](#atendendo-um-chamado)
6. [Fechando e Avaliando um Chamado](#fechando-e-avaliando-um-chamado)
7. [Manutenção Preventiva](#manutenção-preventiva)
8. [Projetos](#projetos)
9. [Avaliações](#avaliações)
10. [Configurações](#configurações)

---

## 1. Visão Geral

Como **Técnico** no In Demands, seu papel principal é **atender e resolver chamados** abertos pelos solicitantes. Você tem acesso a:

- Visualizar e gerenciar chamados atribuídos a você
- Alterar o status dos chamados durante o atendimento
- Fechar chamados e avaliar o atendimento
- Registrar manutenções preventivas
- Visualizar projetos da organização
- Acompanhar suas avaliações de desempenho

### Menu disponível para o Técnico
| Menu | Descrição |
|------|-----------|
| Dashboard | Painel com visão geral dos chamados |
| Chamados | Lista de todos os chamados |
| Avaliações | Histórico de avaliações dos seus atendimentos |
| Preventivas | Registro de manutenções preventivas |
| Projetos | Projetos da organização |
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

## 3. Dashboard

Ao fazer login, você verá o **Dashboard** com um resumo dos chamados:

- **Contadores** por status (Aberto, Em Andamento, etc.)
- **Gráficos** de evolução
- **Visão rápida** dos chamados mais recentes

---

## 4. Gerenciando Chamados

### Acessar: Menu → **Chamados**

### Visualização
A tela de chamados exibe todos os chamados agrupados por responsável. Você verá:
- Seu nome com os chamados atribuídos a você
- Quantidade de chamados por status em badges coloridos

### Expandir grupo
Clique no seu nome para expandir e ver a lista detalhada com:
- **Título** do chamado
- **Solicitante** (quem abriu)
- **Status** atual
- **Categoria** do serviço
- **Data** de criação
- **Prioridade** (Urgente, Alta, Média, Baixa)

### Filtros
Use os filtros na parte superior para encontrar chamados específicos:
- **Busca por texto**: Digite palavras-chave do título, descrição ou nome do solicitante
- **Status**: Filtre por status específico
- **Período**: Selecione datas de início e fim

### Criar Chamado
Você também pode criar chamados clicando em **"+ Novo Chamado"**:
1. Preencha **Título** e **Descrição**
2. Selecione **Prioridade** e **Tipo** (Software/Hardware)
3. Opcionalmente, atribua a um técnico
4. Anexe imagens se necessário (arrastar ou Ctrl+V)
5. Clique em **"Criar Chamado"**

---

## 5. Atendendo um Chamado

### Passo a passo
1. Na lista de chamados, **clique no chamado** que deseja atender
2. O modal de detalhes será aberto com todas as informações
3. Use o **dropdown de Status** para atualizar o andamento:

| Status | Quando usar |
|--------|-------------|
| **Aberto** | Chamado recém-criado, ainda não iniciado |
| **Em Andamento** | Você começou a trabalhar no chamado |
| **Aguardando Aprovação** | Solução aplicada, aguardando confirmação do solicitante |
| **Aprovado** | Solicitante confirmou que o problema foi resolvido |
| **Fechado** | Chamado encerrado definitivamente |

### Informações visíveis no chamado
- **Solicitante**: Quem abriu o chamado
- **Técnico**: Responsável pelo atendimento (você)
- **Descrição**: Detalhes do problema
- **Anexos**: Imagens ou arquivos enviados
- **Prioridade**: Nível de urgência
- **Tipo**: Software ou Hardware

---

## 6. Fechando e Avaliando um Chamado

### Fluxo de Fechamento com Avaliação
Ao finalizar um atendimento, você pode fechar e avaliar em uma única ação:

1. Abra o chamado clicando nele na lista
2. Clique no botão **"Fechar e Avaliar Chamado"**
3. O status será automaticamente alterado para **Fechado**
4. Preencha a avaliação:

#### a) Categoria do Serviço
- Selecione na **árvore de categorias** o item que melhor descreve o serviço realizado
- A árvore mostra: **Macro → Sistema → Item**
- Cada item pode ter uma **pontuação** (pts) associada
- Essa pontuação contribui para suas **metas de desempenho**

#### b) Nota de Atendimento
- Clique nas **estrelas** (1 a 5) para avaliar a qualidade do atendimento
- 1 estrela = Muito ruim | 5 estrelas = Excelente

#### c) Comentário (opcional)
- Adicione observações sobre o atendimento realizado

5. Clique em **"Enviar Avaliação"** para confirmar

> 💡 **Dica**: Se o chamado já estiver fechado, o botão será **"Avaliar Atendimento"** (sem fechar novamente).

---

## 7. Manutenção Preventiva

### Acessar: Menu → **Preventivas**

Registre e acompanhe manutenções preventivas em equipamentos:

### Registrar uma Preventiva
1. Acesse a tela de Preventivas
2. Clique em **"Nova Preventiva"**
3. Preencha:
   - **Tipo de equipamento**: Computador, Impressora, etc.
   - **Patrimônio**: Código do ativo (asset tag)
   - **Data de execução**: Quando a manutenção foi realizada
   - **Checklist**: Itens verificados durante a manutenção
   - **Observações**: Notas adicionais
4. Salve o registro

### Alertas de Atraso
O sistema mostra alertas quando uma manutenção está **atrasada** com base nos intervalos configurados pelo administrador. Exemplo: se um computador deve ser revisado a cada 90 dias e já se passaram 100 dias desde a última manutenção, um alerta será exibido.

---

## 8. Projetos

### Acessar: Menu → **Projetos**

Visualize os projetos da sua organização:
- Nome e descrição do projeto
- Status: Planejamento, Em Andamento, Concluído, Cancelado
- Datas de início e fim
- Responsável pelo projeto

---

## 9. Avaliações

### Acessar: Menu → **Avaliações**

Acompanhe o histórico de avaliações dos chamados que você atendeu:
- Nota recebida (estrelas)
- Comentários
- Chamado relacionado

Suas avaliações contribuem para o cálculo de **metas e desempenho** acompanhado pela administração.

---

## 10. Configurações

### Acessar: Menu → **Configurações**

Ajuste suas preferências pessoais:
- Tema: Modo claro ou escuro (também disponível no rodapé do menu)
- Informações do perfil

---

## Resumo Rápido — Fluxo de Trabalho do Técnico

```
1. Login → Dashboard
2. Acessar Chamados → Ver chamados atribuídos
3. Clicar no chamado → Alterar status para "Em Andamento"
4. Resolver o problema
5. Clicar em "Fechar e Avaliar Chamado"
6. Selecionar categoria de serviço (item)
7. Dar nota (estrelas) + comentário
8. Enviar Avaliação ✅
```

---

## Precisa de Ajuda?

Se tiver dúvidas sobre o uso da plataforma, entre em contato com o **Administrador** da sua organização.

---

*Documentação atualizada em Março de 2026*
