

# Plano: Mostrar chamados com SLA expirado de todos os tecnicos

## Problema
A pagina "Chamados Abertos" filtra apenas por `status = "Aberto"`. Quando o SLA expira, o sistema muda o status para `"Disponível"` e remove o tecnico atribuido. Esses chamados nao aparecem na pagina.

## Mudanca

### Editar `src/pages/ChamadosAbertos.tsx`

Alterar a query para buscar chamados com status `"Aberto"` **ou** `"Disponível"`:

```typescript
// Linha 24: trocar .eq("status", "Aberto") por:
.in("status", ["Aberto", "Disponível"])
```

Adicionar indicacao visual para diferenciar chamados com SLA expirado (status "Disponível") dos chamados abertos normais — por exemplo, um badge vermelho "SLA Expirado" ao lado do status.

### Detalhes tecnicos
- Apenas 1 linha de query alterada + badge condicional
- Sem mudancas no backend

