# 📘 Guia do Administrador — In Demands

## Índice
1. [Visão Geral](#visão-geral)
2. [Acesso e Login](#acesso-e-login)
3. [Dashboard](#dashboard)
4. [Gestão de Chamados](#gestão-de-chamados)
5. [SLA em Horas Úteis](#sla-em-horas-úteis)
6. [Gestão de Usuários](#gestão-de-usuários)
7. [Categorias de Serviço](#categorias-de-serviço)
8. [Manutenção Preventiva](#manutenção-preventiva)
9. [Projetos](#projetos)
10. [Avaliações e Metas](#avaliações-e-metas)
11. [Auditoria](#auditoria)
12. [Histórico](#histórico)
13. [Webhook Logs](#webhook-logs)
14. [White Label](#white-label)
15. [Integrações](#integrações)
16. [Configurações](#configurações)

---

## 1. Visão Geral

O In Demands é um sistema de gestão de chamados técnicos (helpdesk) com suporte a múltiplas organizações. Como **Administrador**, você tem acesso completo à gestão da sua organização, incluindo:

- Gerenciar chamados de todos os usuários
- Criar e gerenciar usuários
- Configurar categorias de serviço e pontuação
- Acompanhar métricas, avaliações e metas dos técnicos
- Auditar chamados e exclusões com exportação CSV
- Gerenciar manutenções preventivas com alertas inteligentes
- Personalizar a identidade visual (white-label)
- Configurar integrações externas

---

## 2. Acesso e Login

### Como acessar
1. Acesse a URL da plataforma
2. Insira seu **e-mail** e **senha**
3. Clique em **Entrar**

### Navegação
O menu lateral esquerdo contém todas as seções disponíveis para seu perfil. No rodapé do menu você encontra:
- **Botão de tema**: Alterna entre modo claro e escuro
- **Botão de ajuda**: Abre a documentação diretamente na aba do seu perfil
- **Botão de logout**: Encerra sua sessão

---

## 3. Dashboard

A página inicial exibe um painel com métricas resumidas do período selecionado:

- **Tempo Médio de Resolução**: Calculado em horas úteis (seg–sex, 08h–18h)
- **CSAT**: Percentual de satisfação dos solicitantes (avaliações ≥ 4 estrelas)
- **Pontuação Total**: Soma dos pontos de todos os chamados fechados avaliados
- **Preventivas vs. Corretivas**: Percentual de manutenções preventivas realizadas
- **Retrabalhos**: Chamados que precisaram ser refeitos
- **Gráficos mensais** de CSAT e tempo médio de resolução (últimos 6 meses)
- **Nota por técnico** e **pontuação por técnico** (rankings)

### Filtro de período
Use o seletor de mês/ano no canto superior direito para filtrar todas as métricas pelo período desejado.

---

## 4. Gestão de Chamados

### Acessar: Menu → **Chamados**

### Visualização
Os chamados são agrupados por **técnico responsável** (ou solicitante, se não houver atribuição). Cada grupo mostra:
- Nome do responsável
- Quantidade total de chamados
- Badges coloridos com contagem por status

### Filtros Avançados
- **Busca por texto**: Pesquise por título, descrição ou nome do solicitante
- **Filtro por status**: Selecione um status específico ou "Todos Status"
- **Filtro por mês**: Filtra por data de criação do chamado
- **Retrabalho**: Exibe apenas chamados com retrabalho registrado
- **Visualização**: Alterne entre **Lista** (agrupada) e **Kanban**

### Coluna Tempo SLA
Cada chamado exibe o tempo decorrido em **horas úteis** (seg–sex, 08h–18h):

| Cor | Significado |
|-----|-------------|
| 🟢 Verde | Dentro do prazo esperado para a prioridade |
| 🟡 Amarelo | Atenção — próximo do limite |
| 🔴 Vermelho | Crítico — prazo ultrapassado |
| Cinza | Chamado fechado — exibe tempo total de resolução |

> Limiares por prioridade: Urgente (aviso 4h / crítico 8h), Alta (8h / 16h), Média (16h / 32h), Baixa (32h / 80h)

### Criar Novo Chamado
1. Clique no botão **"+ Novo Chamado"**
2. Preencha os campos:
   - **Título**: Resumo do problema
   - **Descrição**: Detalhes do chamado
   - **Prioridade**: Urgente, Alta, Média ou Baixa
   - **Tipo**: Software ou Hardware
3. Opcionalmente, selecione um **técnico responsável**
4. Arraste ou cole (Ctrl+V) uma **imagem como anexo**
5. Clique em **"Criar Chamado"**

### Gerenciar um Chamado
Clique em qualquer chamado na lista para abrir os detalhes. Nesta tela você pode:

- **Alterar o status**: `Aberto → Em Andamento → Aguardando Aprovação → Aprovado → Fechado`
- **Ver solicitante e técnico** atribuído
- **Ler a descrição** completa e **ver anexos**
- **Fechar e Avaliar**: Ao fechar um chamado, selecione a **categoria de serviço** (micro-item) e atribua uma nota de 1 a 5 estrelas
- Se o chamado já estiver fechado, o botão muda para **"Alterar Avaliação"**

### Pontuação dos Chamados
A pontuação de um chamado é definida pela **micro-categoria selecionada** na avaliação (score configurado em Categorias). A pontuação atribuída aparece diretamente na tabela de chamados.

---

## 5. SLA em Horas Úteis

O sistema calcula o tempo de atendimento considerando apenas **horas úteis** (segunda a sexta, das 08h às 18h):

- Um chamado aberto há **2 dias corridos** no fim de semana mostra **0h** (não conta)
- Um chamado aberto numa segunda às 08h e fechado na terça às 10h mostra **12h** úteis
- Chamados fechados exibem o **tempo total de resolução** (histórico, em cinza)
- Chamados abertos/em andamento exibem **tempo decorrido** com alerta colorido

---

## 6. Gestão de Usuários

### Acessar: Menu → **Usuários**

Como admin, você pode:

- **Visualizar** todos os usuários da organização
- **Criar novos usuários** (sem necessidade de confirmação por e-mail):
  - Defina: E-mail, Senha, Nome Completo e Perfil (admin, técnico, desenvolvedor ou solicitante)
- **Editar** informações de perfil
- **Alterar a organização** de um usuário

> ⚠️ **Importante**: Apenas super_admins podem alterar roles diretamente.

---

## 7. Categorias de Serviço

### Acessar: Menu → **Categorias**

O sistema usa **estrutura hierárquica de 3 níveis**:

| Nível | Descrição | Exemplo |
|-------|-----------|---------|
| **Macro** | Categoria principal | Infraestrutura |
| **Sistema** | Subcategoria | Rede |
| **Item** | Item específico (pontuável) | Troca de patch cord |

### Como configurar
1. Crie categorias **Macro** primeiro
2. Dentro de cada Macro, crie categorias **Sistema**
3. Dentro de cada Sistema, crie **Itens** com pontuação (score)

### Pontuação (Score)
Cada item tem uma pontuação associada. Quando um técnico fecha um chamado e seleciona a micro-categoria, essa pontuação é registrada e contabilizada nas **Metas dos Técnicos**.

---

## 8. Manutenção Preventiva

### Acessar: Menu → **Preventivas**

Sistema completo de acompanhamento de manutenções preventivas em equipamentos.

### Cards de Status
Na tela principal você encontra 5 cards de resumo:
- **Total Preventivas**: Registros no período selecionado
- **Checklist Completo**: Registros com todos os itens verificados
- **Equipamentos**: Equipamentos únicos no período
- **A Vencer (≤15d)**: Equipamentos com preventiva vencendo em breve
- **Vencidas**: Equipamentos com preventiva atrasada

### Sistema de Alertas em 3 Níveis

**Vencidas** (banner vermelho):
- Equipamentos que ultrapassaram o intervalo configurado
- Exibe: patrimônio, tipo, última manutenção, há quantos dias está vencida
- Botão "Nova Preventiva" para registrar imediatamente

**Próximas a Vencer** (banner âmbar):
- Equipamentos com até **15 dias** para o prazo vencer
- Exibe: patrimônio, tipo, última manutenção, quantos dias restam
- Botão "Agendar" para antecipar a manutenção

### Aba Equipamentos
Cada card de equipamento exibe um **badge de status** colorido:
- 🟢 Verde: `X dias restantes` — dentro do prazo
- 🟡 Âmbar: `Vence em Xd` — atenção
- 🔴 Vermelho: `Vencida há Xd` — em atraso

### Configurar Intervalos
Acesse a aba **Intervalos** (apenas admins) para definir a periodicidade por tipo:
- Desktop / Notebook / Impressora: padrão 90 dias
- Servidor: padrão 60 dias

### Registrar uma Preventiva
1. Clique em **"Nova Preventiva"**
2. Preencha tipo, patrimônio, data de execução, checklist e observações
3. O contador de 90 dias (ou o configurado) reinicia automaticamente

---

## 9. Projetos

### Acessar: Menu → **Projetos**

Gerencie projetos da organização:
- Criar projetos com nome, descrição, responsável e datas
- Acompanhar status: Planejamento, Em Andamento, Concluído, Cancelado

---

## 10. Avaliações e Metas

### Avaliações (Menu → **Avaliações**)
Visualize todas as avaliações de atendimento realizadas nos chamados fechados:
- Nota (1 a 5 estrelas)
- Comentários dos avaliadores
- Chamado relacionado

### Metas dos Técnicos (Menu → **Metas**)

#### Visão do Administrador
A aba **Desempenho** exibe os cards de todos os técnicos com metas definidas. Cada card contém:

- **Avatar com iniciais** e nome do técnico
- **Percentual global** de atingimento das metas
- **Gráfico Radar** (quando há 3 ou mais métricas) mostrando o desempenho visual
- **Sub-cards por métrica** com valor atual, meta, barra de progresso e status:
  - 🟢 Verde com ✓: Meta atingida (≥100%)
  - 🟡 Âmbar: Em andamento (50–99%)
  - 🔴 Vermelho com ⚠: Atenção (<50%)

#### Métricas disponíveis para metas
| Métrica | Descrição |
|---------|-----------|
| Chamados Fechados | Quantidade de chamados fechados no mês |
| Nota Média | Média das avaliações de satisfação (1–5) |
| Pontuação | Soma dos pontos das micro-categorias |
| Tempo Médio Resolução | Tempo médio em horas úteis |
| Preventivas Realizadas | Preventivas registradas no mês |

#### Definir Metas (aba "Definir Metas")
1. Clique em **"Nova Meta"**
2. Selecione o **tipo**: Individual (técnico) ou Setor
3. Para individual: escolha o **técnico** no dropdown (apenas técnicos e desenvolvedores)
4. Selecione a **métrica** e o **valor da meta**
5. Clique em **"Salvar Meta"**

> As metas são mensais. Selecione o mês/ano no seletor superior para ver ou definir metas de períodos específicos.

### Sistema de Pontuação
- A pontuação de cada técnico vem das **avaliações de meta** (`type='meta'`) nos chamados fechados no mês
- Base temporal: `created_at` do chamado (mesma base da Auditoria)
- Uma única pontuação por chamado (garantido por índice único no banco)
- Retrabalhos penalizam a nota de satisfação (−1 por retrabalho, mínimo 1 estrela)

---

## 11. Auditoria

### Acessar: Menu → **Auditoria**

#### Aba Chamados
Tabela completa de todos os chamados do período com:
- **ID** do chamado (truncado)
- **Quem Abriu** (solicitante)
- **Técnico Atribuído**
- **Título** do chamado
- **Data** de criação
- **Status** atual
- **Pontuação** atribuída
- **Categoria** (micro-item selecionado na avaliação)

#### Aba Exclusões
Registro de todos os chamados excluídos no sistema:
- Data e hora da exclusão
- Usuário que realizou a exclusão
- ID do chamado excluído
- Dados do chamado no momento da exclusão

#### Exportar CSV
Clique em **"Exportar CSV"** para baixar a planilha do período. O arquivo é compatível com Excel (BOM UTF-8) e inclui todas as colunas visíveis.

---

## 12. Histórico

### Acessar: Menu → **Histórico**

Log de auditoria de ações no sistema:
- Tipo de ação (criação, atualização, exclusão)
- Usuário responsável
- Entidade afetada
- Data e hora

---

## 13. Webhook Logs

### Acessar: Menu → **Webhook Logs**

Monitore os webhooks enviados pelo sistema:
- Tipo de evento (`ticket.assigned`, `ticket.resolved`)
- Chamado e técnico relacionados
- Código de resposta HTTP
- Corpo da resposta

---

## 14. White Label

### Acessar: Menu → **White Label**

Personalize a identidade visual da sua organização:
- **Nome** da empresa
- **Logo** personalizado
- **Cor primária** (padrão: #0F4C4C)
- **Cor secundária** (padrão: #F5F7F9)
- **Favicon** personalizado
- **Slug** da URL

---

## 15. Integrações

### Acessar: Menu → **Integrações**

Configure integrações externas como notificações via WhatsApp (UAZAPI):
- URL da API, token de autenticação e ID da instância
- Ativar notificações para técnico atribuído e/ou solicitante na resolução

---

## 16. Configurações

### Acessar: Menu → **Configurações**

Configurações gerais do sistema e preferências do usuário.

---

*Documentação atualizada em Abril de 2026*
