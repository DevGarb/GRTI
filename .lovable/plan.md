## Objetivo

Enriquecer a tela pública aberta pelo QR Code (`/asset/:id`) com informações operacionais úteis em campo, sem expor dados sensíveis e sem exigir login.

## Blocos a incluir

1. **Última manutenção preventiva** — data, responsável e observações.
2. **Status de manutenção** — badge "Em dia" / "Próxima do vencimento" (≤15 dias) / "Atrasada", calculado por `maintenance_intervals.interval_days` para o `equipment_type`. Mostra "Próxima prevista: dd/mm/yyyy".
3. **Histórico de manutenções** — bloco colapsável mostrando a última manutenção registrada (data + responsável + obs).
4. **Tempo de uso + linha do tempo de realocação** — "Em uso há X meses" calculado de `created_at`, seguido de timeline com cada mudança de responsável/setor/localização.

Sem botão de copiar tag, sem botão de abrir chamado.

## Mudanças no banco (migração)

Nova tabela `patrimonio_history` para registrar realocações:

```text
patrimonio_history
  id              uuid pk
  patrimonio_id   uuid (referência lógica, sem FK por padrão do projeto)
  organization_id uuid
  changed_at      timestamptz default now()
  changed_by      uuid (nullable — pode ser sistema)
  field           text  ('responsible' | 'sector' | 'location' | 'status')
  old_value       text
  new_value       text
```

- RLS: SELECT permitido para mesma organização (igual `patrimonio`); INSERT só via trigger (sem policy de INSERT pública).
- Trigger `BEFORE UPDATE ON patrimonio` que, para cada um dos 4 campos, insere uma linha em `patrimonio_history` quando o valor muda. `changed_by = auth.uid()`.
- A timeline começa a partir da implantação (registros antigos não terão histórico — fica explícito na UI).

## Edge function `supabase/functions/get-public-asset/index.ts`

Estender o retorno (mantendo público, sem auth, continuando a omitir `organization_id` e campos sensíveis):

- `last_maintenance`: última linha de `preventive_maintenance` por `asset_tag` + `organization_id` (campos: `execution_date`, `responsible`, `notes`).
- `maintenance_interval_days`: lookup em `maintenance_intervals` por `equipment_type` (nullable se não houver).
- `relocation_history`: até 10 linhas de `patrimonio_history` por `patrimonio_id`, ordenadas desc (campos: `changed_at`, `field`, `old_value`, `new_value`).

Cálculo de "próxima prevista" e badge fica no frontend (a partir de `last_maintenance.execution_date + maintenance_interval_days`).

## Frontend `src/pages/AssetPublicView.tsx`

Inserir blocos entre o card de Status e o de Detalhes:

- **Card "Manutenção"**: badge colorida (verde/amarelo/vermelho) tingida com `primary_color` no contorno; linhas "Última: dd/mm/yyyy — NOME" e "Próxima prevista: dd/mm/yyyy". Se não há `last_maintenance`, mostra "Sem preventiva registrada".
- **"Em uso há X meses"**: linha discreta abaixo do card de Manutenção, calculada de `created_at`.
- **Bloco colapsável "Histórico de manutenção"**: mostra a última manutenção (data + responsável + observações).
- **Bloco colapsável "Linha do tempo do equipamento"**: lista cronológica das realocações registradas (`changed_at` + ícone do campo + "de X para Y"). Se vazio, exibe nota "Sem alterações registradas desde a implantação do histórico".

Manter intacto: skeleton, cooldown do "Tentar novamente", branding via `primary_color`, layout mobile-first.

## Layout final (mobile)

```text
┌─────────────────────┐
│ [Logo] Organização  │
├─────────────────────┤
│ Foto / Header       │
│ 10072 • Notebook    │
├─────────────────────┤
│ ● Status: Ativo     │
├─────────────────────┤
│ 🛠 Manutenção       │
│  Em dia ✓           │
│  Última: 27/04/26   │
│         FELIPE A.   │
│  Próxima: 27/07/26  │
├─────────────────────┤
│ Em uso há 14 meses  │
├─────────────────────┤
│ Detalhes (atual)    │
├─────────────────────┤
│ ⌄ Histórico manut.  │
├─────────────────────┤
│ ⌄ Linha do tempo    │
└─────────────────────┘
```

## Memória a atualizar

- `mem://features/preventive-maintenance` — anotar que a tela pública mostra última preventiva + status calculado por `maintenance_intervals`.
- `mem://features/multi-tenancy` — anotar nova tabela `patrimonio_history` com RLS por organização e trigger automático em `patrimonio`.
