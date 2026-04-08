

# Plano: Calcular tempo de chamados apenas em horário comercial (8h-18h)

## Resumo
Criar uma função utilitária que calcula minutos entre duas datas considerando apenas horário comercial (08:00-18:00, seg-sex). Usar essa função em todos os cálculos de tempo de resolução no `useDashboardMetrics`.

## Mudanças

### 1. Criar `src/lib/businessHours.ts`
Função `calcBusinessMinutes(start: Date, end: Date): number` que:
- Considera apenas dias úteis (seg-sex)
- Conta apenas minutos entre 08:00 e 18:00 (10h/dia)
- Se o chamado abriu às 16h, conta 2h naquele dia
- Se fechou às 09h no dia seguinte, conta +1h nesse dia
- Total = soma dos minutos comerciais de cada dia no intervalo

### 2. Atualizar `src/hooks/useDashboardMetrics.ts`
Substituir os 2 cálculos de diferença de tempo (linhas 61 e 182) pela nova função:
- `const diff = calcBusinessMinutes(new Date(t.created_at), new Date(t.updated_at))`

### Detalhes técnicos
- A função itera dia a dia no intervalo, para cada dia calcula o overlap entre [08:00-18:00] e [start-end]
- Finais de semana (sáb/dom) são ignorados (0 minutos)
- Sem dependências externas, apenas lógica de Date nativa

