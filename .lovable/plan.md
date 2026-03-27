

# Plano: Aba de Tokens de API no Super Admin

## Objetivo
Adicionar uma nova aba "API" no painel Super Admin onde ele pode gerar tokens de autenticacao e visualizar as credenciais necessarias para conexao externa via API.

## Mudancas

### 1. Criar tabela `api_tokens` no banco
Nova tabela para armazenar tokens gerados pelo super admin:
- `id` (uuid, PK)
- `name` (text) - nome descritivo do token
- `token` (text, unique) - token gerado (UUID ou hash)
- `created_by` (uuid) - user_id do super admin que criou
- `organization_id` (uuid, nullable) - organizacao vinculada (opcional)
- `is_active` (boolean, default true)
- `last_used_at` (timestamptz, nullable)
- `expires_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())

RLS: somente super_admin pode SELECT, INSERT, UPDATE e DELETE.

### 2. Criar edge function `api-gateway`
Endpoint que valida o token recebido no header `X-API-Token`, verifica se esta ativo e nao expirado, e encaminha a requisicao para os dados solicitados (tickets, patrimonio, preventivas, etc.). Retorna 401 se token invalido.

### 3. Atualizar `src/pages/SuperAdmin.tsx`
- Adicionar `"api"` ao tipo `Tab`
- Adicionar aba "API" com icone `Key` no tab bar
- Criar componente `ApiTokensTab` com:
  - Card com informacoes de conexao: Base URL, headers necessarios (X-API-Token, Content-Type)
  - Formulario para criar token (nome, organizacao opcional, data de expiracao opcional)
  - Lista de tokens existentes com acoes: copiar, ativar/desativar, excluir
  - O token completo so e exibido uma vez apos criacao (depois fica mascarado)
  - Exemplos de uso com curl/JS para facilitar integracao

### Detalhes tecnicos
- Token gerado com `crypto.randomUUID()` no client, armazenado no banco
- Edge function `api-gateway` consulta a tabela `api_tokens` para validar
- Apenas super_admin tem acesso a aba e aos dados da tabela via RLS
- A edge function expoe endpoints como `/api-gateway?resource=tickets&org_id=xxx`

