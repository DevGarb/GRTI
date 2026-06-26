## Objetivo
Garantir que toda troca de responsável de patrimônio seja registrada e exibida com destaque na página pública do QR Code, em uma linha do tempo unificada (responsável + setor + localização + status), e refletir essas mudanças em tempo real ao escanear o QR.

## Backend (migration)

1. **Trigger de UPDATE em `patrimonio`** — auditar se o trigger `log_patrimonio_changes` cobre todos os campos relevantes (`responsible`, `sector`, `location`, `status`). Se faltar `status`, adicionar.
2. **Bloquear UPDATE silencioso sem auditoria** — garantir que `auth.uid()` seja capturado mesmo em chamadas via service_role (fallback para `updated_by` se existir, senão deixar NULL e marcar "Sistema").
3. **RPC `register_patrimonio_transfer(patrimonio_id, new_responsible, reason)`** — opcional: usada pelo modal de edição quando o admin quiser registrar explicitamente uma transferência com motivo (vai como `notes` na entrada do histórico).
4. Adicionar coluna `reason TEXT` em `patrimonio_history` para guardar motivo de transferência.

## Edge function `get-public-asset`

- Já retorna `responsible_history` e `relocation_history`. Incluir `reason` no payload.
- Garantir ordenação consistente (desc por `changed_at`) e limite ampliado para 100.

## Frontend — `AssetPublicView` (página do QR)

1. **Reformular o bloco principal** para uma única **"Linha do tempo do equipamento"** unificada e em destaque (não colapsada por padrão), mesclando:
   - Trocas de responsável (badge azul, ícone User)
   - Trocas de setor (badge âmbar, ícone Building)
   - Trocas de localização (badge violeta, ícone MapPin)
   - Trocas de status (badge cinza, ícone Activity)
   - Manutenções preventivas executadas (badge verde, ícone Wrench)
2. Card "Responsável atual" no topo com nome em destaque, data desde quando, e botão "Ver histórico completo" que rola para a timeline.
3. Cada item da timeline mostra: data/hora, autor da mudança, "de → para" e motivo (quando houver).
4. Filtros rápidos (chips) acima da timeline: Todos · Responsável · Setor · Localização · Manutenção.

## Frontend — `EditPatrimonioModal`

- Quando o usuário alterar o campo `responsible`, abrir um sub-prompt "Motivo da transferência" (opcional) que é salvo na nova coluna `reason`.
- Toast confirmando "Transferência registrada no histórico".

## Frontend — `PatrimonioQRCodeModal`

- Adicionar no rodapé do card uma linha "Última transferência: <data> · <para quem>" puxada do histórico, para conferência rápida antes de imprimir.

## Validação

1. Editar um patrimônio existente trocando o responsável → confirmar entrada no `patrimonio_history` com `reason`.
2. Abrir `/asset/<id>` em janela anônima → timeline unificada aparece, responsável atual em destaque, filtros funcionam.
3. Testar com patrimônio sem histórico → mensagem "Sem alterações registradas".

## Arquivos afetados

- `supabase/migrations/<novo>.sql` (coluna `reason`, ajuste de trigger)
- `supabase/functions/get-public-asset/index.ts`
- `src/pages/AssetPublicView.tsx` (reformulação visual da timeline)
- `src/components/EditPatrimonioModal.tsx` (prompt de motivo)
- `src/components/PatrimonioQRCodeModal.tsx` (linha de última transferência)
- `src/hooks/usePatrimonio.ts` (suporte ao campo `reason` no update)
