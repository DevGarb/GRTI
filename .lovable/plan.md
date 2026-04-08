

# Plano: Mini-dashboard de contadores na pagina de Chamados (tecnicos e colaboradores)

## Resumo
Adicionar 4 cards de resumo no topo da pagina de Chamados mostrando: Total de chamados, Abertos, Em Andamento e Fechados. Visivel para tecnicos e colaboradores (e tambem admin, pois nao prejudica).

## Mudancas

### 1. Editar `src/pages/Chamados.tsx`

Adicionar um componente de 4 cards entre o titulo/botao e os filtros:

- **Total**: `filtered.length`
- **Abertos**: chamados com status `"Aberto"`
- **Em Andamento**: chamados com status `"Em Andamento"`
- **Fechados**: chamados com status `"Fechado"`

Cada card tera:
- Icone representativo
- Label descritivo
- Numero grande em destaque
- Cores distintas por status (vermelho para abertos, amarelo para andamento, verde para fechados, azul para total)

Os contadores serao calculados a partir da lista `filtered` (ja filtrada por busca/status/data), refletindo os filtros ativos.

Layout: grid responsivo com 4 colunas em desktop, 2 em mobile.

### Detalhes tecnicos
- Sem novas dependencias
- Sem mudancas no backend ou banco de dados
- Apenas alteracao visual no componente da pagina Chamados
- Usar classes Tailwind existentes e o padrao `card-elevated` do projeto

