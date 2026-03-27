# Documentação da API REST

## Visão Geral

O sistema disponibiliza uma API Gateway para integração externa via tokens de autenticação. Apenas **Super Admins** podem gerar tokens no painel administrativo.

---

## Autenticação

Todas as requisições à API devem incluir o header `X-API-Token` com um token válido gerado pelo Super Admin.

### Headers Obrigatórios

| Header | Valor | Descrição |
|--------|-------|-----------|
| `X-API-Token` | `seu-token-aqui` | Token de autenticação gerado no painel |
| `Content-Type` | `application/json` | Tipo do conteúdo (para POST/PATCH) |

---

## URL Base

```
https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway
```

---

## Recursos Disponíveis

Os seguintes recursos podem ser acessados via parâmetro `?resource=`:

| Recurso | Descrição |
|---------|-----------|
| `tickets` | Chamados do sistema |
| `profiles` | Perfis de usuários |
| `categories` | Categorias de chamados |
| `patrimonio` | Patrimônio / Ativos |
| `preventive_maintenance` | Manutenções preventivas |
| `sectors` | Setores |
| `projects` | Projetos |
| `evaluations` | Avaliações |
| `ticket_comments` | Comentários de chamados |
| `ticket_history` | Histórico de chamados |
| `organizations` | Organizações |

---

## Endpoints

### Listar Registros (GET)

Retorna uma lista paginada de registros.

**Parâmetros de Query:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `resource` | string | — | Recurso a consultar (obrigatório) |
| `org_id` | uuid | — | Filtrar por organização |
| `limit` | number | 50 | Quantidade de registros |
| `offset` | number | 0 | Pular registros |

**Exemplo com cURL:**

```bash
curl -X GET \
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=tickets&limit=10" \
  -H "X-API-Token: seu-token-aqui"
```

**Exemplo com JavaScript:**

```javascript
const response = await fetch(
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=tickets&limit=10",
  {
    headers: {
      "X-API-Token": "seu-token-aqui"
    }
  }
);
const { data, meta } = await response.json();
console.log(data); // Array de tickets
```

**Resposta:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Problema no computador",
      "status": "Aberto",
      "priority": "Alta",
      "created_at": "2026-03-27T10:00:00Z"
    }
  ],
  "meta": {
    "limit": 10,
    "offset": 0
  }
}
```

---

### Buscar Registro por ID (GET)

**Exemplo com cURL:**

```bash
curl -X GET \
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=tickets&id=uuid-do-ticket" \
  -H "X-API-Token: seu-token-aqui"
```

**Exemplo com JavaScript:**

```javascript
const response = await fetch(
  `https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=tickets&id=${ticketId}`,
  {
    headers: { "X-API-Token": "seu-token-aqui" }
  }
);
const { data } = await response.json();
```

---

### Criar Registro (POST)

**Exemplo com cURL:**

```bash
curl -X POST \
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=tickets" \
  -H "X-API-Token: seu-token-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Novo chamado via API",
    "description": "Descrição do problema",
    "priority": "Alta",
    "type": "Hardware",
    "created_by": "uuid-do-usuario"
  }'
```

**Exemplo com JavaScript:**

```javascript
const response = await fetch(
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=tickets",
  {
    method: "POST",
    headers: {
      "X-API-Token": "seu-token-aqui",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Novo chamado via API",
      description: "Descrição do problema",
      priority: "Alta",
      type: "Hardware",
      created_by: "uuid-do-usuario"
    })
  }
);
const { data } = await response.json();
// Status 201 Created
```

**Resposta (201):**

```json
{
  "data": {
    "id": "novo-uuid-gerado",
    "title": "Novo chamado via API",
    "status": "Aberto",
    "created_at": "2026-03-27T12:00:00Z"
  }
}
```

---

### Atualizar Registro (PATCH)

**Exemplo com cURL:**

```bash
curl -X PATCH \
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=tickets&id=uuid-do-ticket" \
  -H "X-API-Token: seu-token-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "Crítica",
    "description": "Descrição atualizada"
  }'
```

**Exemplo com JavaScript:**

```javascript
const response = await fetch(
  `https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=tickets&id=${ticketId}`,
  {
    method: "PATCH",
    headers: {
      "X-API-Token": "seu-token-aqui",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      priority: "Crítica",
      description: "Descrição atualizada"
    })
  }
);
const { data } = await response.json();
```

---

## Exemplos por Recurso

### Patrimônio

```bash
# Listar ativos
curl -X GET \
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=patrimonio&limit=20" \
  -H "X-API-Token: seu-token-aqui"

# Criar ativo
curl -X POST \
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=patrimonio" \
  -H "X-API-Token: seu-token-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "asset_tag": "PAT-001",
    "equipment_type": "Computador",
    "brand": "Dell",
    "model": "Optiplex 7090",
    "serial_number": "SN123456",
    "sector": "TI",
    "created_by": "uuid-do-usuario"
  }'
```

### Manutenções Preventivas

```bash
# Listar preventivas
curl -X GET \
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=preventive_maintenance" \
  -H "X-API-Token: seu-token-aqui"
```

### Categorias

```bash
# Listar categorias
curl -X GET \
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=categories" \
  -H "X-API-Token: seu-token-aqui"
```

### Setores

```bash
# Listar setores
curl -X GET \
  "https://gtimcognsszzsfpavups.supabase.co/functions/v1/api-gateway?resource=sectors" \
  -H "X-API-Token: seu-token-aqui"
```

---

## Códigos de Resposta

| Código | Significado |
|--------|-------------|
| `200` | Sucesso (GET/PATCH) |
| `201` | Criado com sucesso (POST) |
| `400` | Requisição inválida (recurso inválido ou erro de dados) |
| `401` | Token ausente, inválido, inativo ou expirado |
| `405` | Método HTTP não permitido |
| `500` | Erro interno do servidor |

---

## Erros Comuns

### Token ausente
```json
{ "error": "Missing X-API-Token header" }
```

### Token inválido ou inativo
```json
{ "error": "Invalid or inactive token" }
```

### Token expirado
```json
{ "error": "Token expired" }
```

### Recurso inválido
```json
{
  "error": "Invalid or missing resource parameter",
  "allowed": ["tickets", "profiles", "categories", "patrimonio", ...]
}
```

---

## Dicas de Integração

1. **Tokens com escopo**: Se o token foi criado vinculado a uma organização, ele filtrará automaticamente os dados dessa organização.
2. **Paginação**: Use `limit` e `offset` para paginar resultados grandes.
3. **Segurança**: Nunca exponha seu token em código client-side. Use sempre no backend.
4. **Monitoramento**: O campo `last_used_at` do token é atualizado a cada uso.
