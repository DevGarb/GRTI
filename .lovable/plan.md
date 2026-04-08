

# Plano: Filtro de chamados por perfil de usuario

## Resumo
- **Admin/Super Admin**: ve todos os chamados da organizacao
- **Tecnico/Desenvolvedor**: ve apenas chamados atribuidos a ele + chamados com status "Disponivel" (SLA expirado) que podem ser reatribuidos
- **Colaborador (solicitante)**: ve apenas chamados que ele criou

## Mudancas

### 1. Atualizar RLS da tabela `tickets` (SELECT)
A politica atual ja cobre parcialmente isso, mas precisa ser ajustada para garantir que tecnicos vejam chamados "Disponivel" independente de atribuicao:

A politica atual ja esta correta:
```sql
(created_by = auth.uid()) OR (assigned_to = auth.uid()) OR 
has_role(auth.uid(), 'admin') OR 
((status = 'Disponível') AND has_role(auth.uid(), 'tecnico'))
```
Nenhuma mudanca necessaria no RLS.

### 2. Atualizar `useTickets` hook (`src/hooks/useTickets.ts`)
Adicionar filtragem baseada no role do usuario:
- Se admin/super_admin: query sem filtro de usuario (apenas org)
- Se tecnico/desenvolvedor: filtrar por `assigned_to = user.id` OR `status = 'Disponivel'`
- Se colaborador: filtrar por `created_by = user.id`

Receber `roles` e `user` do AuthContext e aplicar filtros condicionais na query do Supabase.

### 3. Atualizar pagina Chamados (`src/pages/Chamados.tsx`)
- Manter secao "Disponiveis para assumir" visivel apenas para tecnicos
- Separar visualmente os chamados do tecnico dos disponiveis
- Nenhuma mudanca estrutural grande necessaria, a filtragem ja vem do hook

### Detalhes tecnicos
- O filtro principal acontece no hook `useTickets` via query Supabase
- O RLS serve como camada de seguranca adicional (ja esta correto)
- Para tecnicos, usar `.or()` do Supabase: `assigned_to.eq.{userId},status.eq.Disponível`
- Para colaboradores: `.eq("created_by", userId)`

