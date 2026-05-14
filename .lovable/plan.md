## Nova tela de Login (Split-screen)

Refatorar `src/pages/Login.tsx` aplicando a direção **Split-screen branding** escolhida.

### Layout

```text
┌─────────────────────────┬─────────────────────────┐
│  PAINEL DE MARCA        │  FORMULÁRIO             │
│  (gradient teal)        │  (slate-950)            │
│                         │                         │
│  [Logo GR]              │  Login                  │
│  GRTI                   │  "Entre com..."         │
│  ──                     │                         │
│  "Gestão inteligente    │  Usuário                │
│   e suporte ágil..."    │  [NOME.SOBRENOME    ]   │
│                         │                         │
│                         │  Senha                  │
│                         │  [••••••••       👁]    │
│                         │       Esqueci minha senha?│
│                         │                         │
│                         │  [ Entrar no sistema ]  │
│                         │                         │
│                         │  · GRTI v2.0 · Suporte ·│
└─────────────────────────┴─────────────────────────┘
```

Mobile (<lg): painel da marca some, logo compacto fica acima do form.

### Funcionalidades

1. **Toggle mostrar/ocultar senha** — botão olho (ícone `Eye`/`EyeOff` do lucide-react) dentro do input.
2. **Esqueci minha senha** — link `<a target="_blank">` apontando para:
   ```
   https://wa.me/5585981519958?text=Olá, gostaria de solicitar uma nova senha para o sistema GRTI. Meu login é: 
   ```
3. **Rodapé** — pill discreta com `GRTI v2.0 · Suporte (85) 98151-9958` (texto provisório, fácil editar).
4. **Manter** toda a lógica de `signIn` + redirect existente (auth, organizações, roles).

### Detalhes técnicos

- Substituir cores hard-coded (`bg-slate-950`, `text-teal-400` etc.) por **tokens semânticos** do design system. Onde necessário, adicionar/ajustar tokens em `src/index.css` e `tailwind.config.ts` (ex: `--brand`, `--brand-foreground`, `--gradient-brand`).
- Adicionar import `Eye`, `EyeOff` de `lucide-react`.
- Estado local: `showPassword` boolean.
- Logo: continua "GR" placeholder por enquanto (usuário enviará a logo final em mensagem separada — substituiremos no próximo turno).
- `framer-motion` continua para fade-in suave do form e do painel.
- Acessibilidade: `aria-label` no botão de toggle, `autoComplete="username"` e `autoComplete="current-password"`.

### Arquivos

- **editar** `src/pages/Login.tsx` — rewrite completo do JSX, lógica de submit intacta.
- **editar** `src/index.css` — opcional: adicionar `--brand` e `--gradient-brand` se ainda não existirem com a cor teal exata.

Sem mudanças em backend / banco / edge functions.
