## 1. KPI Retrabalho (porcentagem)

**Adicionar nova métrica** em `src/components/metas/GoalsManager.tsx`:
```
{ value: "rework_percent", label: "Retrabalho Máximo", short: "Retrabalho", unit: "%", step: 0.5, icon: RefreshCw, inverse: true }
```

Flag `inverse: true` indica que **valores menores = melhor** (ao contrário das outras metas). Já existe `rework_percent` no retorno de `useManagementMetrics`, então o cálculo de progresso já tem a base pronta.

**Atualizar `src/components/metas/MyGoalCard.tsx` e `GoalsSummaryCards.tsx`:**
- Reconhecer `rework_percent` como métrica invertida.
- Progresso: `progresso = (meta / valor_atual) * 100` (limitado a 100%), em vez de `(atual/meta)*100`.
- Status "atingida" quando `valor_atual <= meta`.
- Label de exibição: `"3.2% / máx 5%"`.

Nenhuma mudança no schema — `performance_goals.metric` é text livre.

## 2. Máscaras em Usuários (Telefone + CPF)

**Novo arquivo `src/lib/masks.ts`** com helpers puros:
- `maskPhone(v)` → `(00) 00000-0000` (aceita 10 ou 11 dígitos).
- `maskCPF(v)` → `000.000.000-00`.
- `unmask(v)` → remove tudo que não é dígito (para salvar no banco apenas dígitos).
- `isValidCPF(v)` → validação dos dígitos verificadores.

**Migration** — adicionar coluna `cpf TEXT` em `public.profiles` (nullable, sem unique para evitar conflito com legados; validação só no front).

**`src/pages/Usuarios.tsx`** — em ambos os modais (criar e editar):
- Campo Telefone: aplicar `maskPhone` no `onChange`, `maxLength=15`, `inputMode="tel"`.
- Adicionar campo **CPF** logo abaixo: aplicar `maskCPF`, `maxLength=14`, `inputMode="numeric"`, validar com `isValidCPF` no submit (toast de erro se inválido e não vazio).
- Carregar e salvar `cpf` junto com `phone` (salvar apenas dígitos com `unmask`, exibir com máscara).

**`supabase/functions/create-user/index.ts` e `update-user/index.ts`** — aceitar e gravar campo `cpf` em `profiles`.

## Resumo de arquivos

- `supabase/migrations/...` — `ALTER TABLE profiles ADD COLUMN cpf TEXT`.
- `src/lib/masks.ts` (novo).
- `src/components/metas/GoalsManager.tsx` — nova métrica retrabalho.
- `src/components/metas/MyGoalCard.tsx` e `GoalsSummaryCards.tsx` — lógica invertida para `rework_percent`.
- `src/pages/Usuarios.tsx` — máscaras + campo CPF nos dois modais.
- `supabase/functions/create-user/index.ts` e `update-user/index.ts` — propagar `cpf`.