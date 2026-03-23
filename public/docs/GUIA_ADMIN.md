# 📘 Guia do Administrador — In Demands

## Índice
1. [Visão Geral](#visão-geral)
2. [Acesso e Login](#acesso-e-login)
3. [Dashboard](#dashboard)
4. [Gestão de Chamados](#gestão-de-chamados)
5. [Gestão de Usuários](#gestão-de-usuários)
6. [Categorias de Serviço](#categorias-de-serviço)
7. [Manutenção Preventiva](#manutenção-preventiva)
8. [Projetos](#projetos)
9. [Avaliações e Metas](#avaliações-e-metas)
10. [Histórico e Auditoria](#histórico-e-auditoria)
11. [Webhook Logs](#webhook-logs)
12. [White Label](#white-label)
13. [Integrações](#integrações)
14. [Configurações](#configurações)

---

## 1. Visão Geral

O In Demands é um sistema de gestão de chamados técnicos (helpdesk) com suporte a múltiplas organizações. Como **Administrador**, você tem acesso completo à gestão da sua organização, incluindo:

- Gerenciar chamados de todos os usuários
- Criar e gerenciar usuários
- Configurar categorias de serviço
- Acompanhar métricas e avaliações
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
- **Botão de logout**: Encerra sua sessão

---

## 3. Dashboard

A página inicial exibe um painel com métricas resumidas:

- **Total de chamados** por status (Aberto, Em Andamento, Aguardando Aprovação, Aprovado, Fechado)
- **Gráficos** de evolução temporal
- **Indicadores rápidos** para tomada de decisão

---

## 4. Gestão de Chamados

### Acessar: Menu → **Chamados**

### Visualização
Os chamados são agrupados por **técnico responsável** (ou solicitante, se não houver técnico atribuído). Cada grupo mostra:
- Nome do responsável
- Quantidade total de chamados
- Badges coloridos com contagem por status

### Filtros Avançados
- **Busca por texto**: Pesquise por título, descrição ou nome do solicitante
- **Filtro por status**: Selecione um status específico ou "Todos Status"
- **Filtro por data**: Defina um período (de/até) para filtrar por data de criação

### Criar Novo Chamado
1. Clique no botão **"+ Novo Chamado"** (canto superior direito)
2. Preencha os campos obrigatórios:
   - **Título**: Resumo do problema
   - **Descrição**: Detalhes do chamado
   - **Prioridade**: Urgente, Alta, Média ou Baixa
   - **Tipo**: Software ou Hardware
3. Opcionalmente, selecione um **técnico responsável**
4. Você pode arrastar ou colar (Ctrl+V) uma **imagem como anexo**
5. Clique em **"Criar Chamado"**

### Gerenciar um Chamado
Clique em qualquer chamado na lista para abrir os detalhes. Nesta tela você pode:

- **Alterar o status**: Use o dropdown de status (Aberto → Em Andamento → Aguardando Aprovação → Aprovado → Fechado)
- **Ver solicitante e técnico** atribuído
- **Ler a descrição** completa
- **Ver anexos** associados
- **Fechar e Avaliar**: Ao fechar um chamado, selecione a categoria de serviço (item) e atribua uma nota de 1 a 5 estrelas com comentário opcional

### Fluxo de Status
```
Aberto → Em Andamento → Aguardando Aprovação → Aprovado → Fechado
```

---

## 5. Gestão de Usuários

### Acessar: Menu → **Usuários**

Como admin, você pode:

- **Visualizar** todos os usuários da organização
- **Criar novos usuários**: O sistema cria a conta automaticamente (sem necessidade de confirmação por e-mail)
  - Defina: E-mail, Senha, Nome Completo e Perfil (admin, técnico ou solicitante)
- **Editar** informações de perfil dos usuários
- **Alterar a organização** de um usuário

> ⚠️ **Importante**: Apenas super_admins podem alterar roles diretamente. Admins podem criar usuários com o perfil desejado.

---

## 6. Categorias de Serviço

### Acessar: Menu → **Categorias**

O sistema utiliza uma **estrutura hierárquica de categorias**:

| Nível | Descrição | Exemplo |
|-------|-----------|---------|
| **Macro** | Categoria principal | Infraestrutura |
| **Sistema** | Subcategoria | Rede |
| **Item** | Item específico (pontuável) | Troca de patch cord |

### Como configurar
1. Crie categorias **Macro** primeiro
2. Dentro de cada Macro, crie categorias de nível **Sistema**
3. Dentro de cada Sistema, crie **Itens** com pontuação (score)

### Pontuação (Score)
Cada item pode ter uma pontuação associada. Essa pontuação é usada nas **Metas dos Técnicos** para calcular desempenho.

---

## 7. Manutenção Preventiva

### Acessar: Menu → **Preventivas**

Gerencie manutenções preventivas programadas:

- **Intervalos**: Configure a periodicidade por tipo de equipamento (ex: Computador a cada 90 dias)
- **Registros**: Visualize e crie registros de manutenção com:
  - Tipo de equipamento
  - Patrimônio (asset tag)
  - Data de execução
  - Checklist de verificação
  - Observações
- **Alertas de atraso**: O sistema alerta sobre manutenções em atraso

---

## 8. Projetos

### Acessar: Menu → **Projetos**

Gerencie projetos da organização:
- Criar projetos com nome, descrição, responsável e datas
- Acompanhar status: Planejamento, Em Andamento, Concluído, Cancelado

---

## 9. Avaliações e Metas

### Avaliações (Menu → **Avaliações**)
Visualize todas as avaliações de atendimento realizadas nos chamados fechados:
- Nota (1 a 5 estrelas)
- Comentários dos avaliadores
- Chamado relacionado

### Metas dos Técnicos (Menu → **Metas**)
Acompanhe o desempenho dos técnicos baseado na pontuação acumulada das categorias de serviço dos chamados atendidos.

---

## 10. Histórico e Auditoria

### Acessar: Menu → **Histórico**

Visualize o log de auditoria com todas as ações realizadas no sistema:
- Tipo de ação (criação, atualização, exclusão)
- Usuário responsável
- Entidade afetada
- Data e hora

---

## 11. Webhook Logs

### Acessar: Menu → **Webhook Logs**

Monitore os webhooks enviados pelo sistema:
- Tipo de evento (ticket.assigned, ticket.resolved)
- Chamado e técnico relacionados
- Código de resposta HTTP
- Corpo da resposta

---

## 12. White Label

### Acessar: Menu → **White Label**

Personalize a identidade visual da sua organização:
- **Nome** da empresa
- **Logo** personalizado
- **Cor primária** (padrão: #0F4C4C)
- **Cor secundária** (padrão: #F5F7F9)
- **Slug** da URL

---

## 13. Integrações

### Acessar: Menu → **Integrações**

Configure integrações externas como notificações via WhatsApp (UAZAPI):
- URL da API
- Token de autenticação
- ID da instância
- Ativar/desativar notificações para:
  - Técnico atribuído ao chamado
  - Solicitante quando chamado é resolvido

---

## 14. Configurações

### Acessar: Menu → **Configurações**

Configurações gerais do sistema e preferências do usuário.

---

*Documentação atualizada em Março de 2026*
