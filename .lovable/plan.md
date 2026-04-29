## Problema

Ao escanear o QR Code do patrimônio sem estar logado, a página `/asset/:id` mostra "Patrimônio não encontrado". Causa: a rota é pública, mas o `select` na tabela `patrimonio` é feito com a chave anon do Supabase, e a RLS exige `authenticated` (super_admin ou mesma organização). Logo, nenhum dado retorna.

## Solução

Criar uma edge function pública (`get-public-asset`) que usa o `service_role` para buscar o patrimônio por ID e retorna apenas campos seguros para exibição mobile. A página `AssetPublicView` passa a consumir essa função em vez de consultar a tabela diretamente.

Não vamos relaxar a RLS da tabela `patrimonio` (manteria dados expostos a qualquer um com a anon key). A edge function é o ponto único de exposição controlada.

## Alterações

### 1. Edge function `supabase/functions/get-public-asset/index.ts` (nova)
- `verify_jwt = false` (já é o padrão)
- Aceita `GET /get-public-asset?id=<uuid>` ou `POST { id }`
- Valida UUID com Zod
- Usa `SUPABASE_SERVICE_ROLE_KEY` para ler `patrimonio` por id
- Retorna apenas: `id`, `asset_tag`, `equipment_type`, `brand`, `model`, `serial_number`, `sector`, `responsible`, `location`, `status`, `notes`, `photo_url`, `created_at`, e `organization: { name, logo_url, primary_color }` (join leve em `organizations` para branding)
- Não retorna `created_by`, `updated_at`, `organization_id` cru
- 404 se não encontrar; CORS liberado

### 2. `src/pages/AssetPublicView.tsx`
- Substituir o `supabase.from("patrimonio").select(...)` por `fetch` direto na URL pública da função (`https://<project>.supabase.co/functions/v1/get-public-asset?id=...`) com header `apikey` = anon key. Não usar `supabase.functions.invoke` para evitar exigência de sessão.
- Exibir logo + nome da organização no topo do card quando vierem na resposta
- Manter o layout mobile-first atual (já está bom: hero card, status badge, detalhes em rows)
- Pequenos ajustes: garantir `viewport` correto (já vem do index.html) e melhorar mensagem de erro

### 3. Memória
- Atualizar `mem://features/multi-tenancy` notando que `/asset/:id` é endpoint público via edge function `get-public-asset` (somente leitura, campos restritos).

## Detalhes técnicos

```ts
// edge function
const url = new URL(req.url);
const id = url.searchParams.get("id") ?? (await req.json().catch(() => ({}))).id;
const parsed = z.string().uuid().safeParse(id);
if (!parsed.success) return json({ error: "invalid id" }, 400);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const { data, error } = await supabase
  .from("patrimonio")
  .select("id, asset_tag, equipment_type, brand, model, serial_number, sector, responsible, location, status, notes, photo_url, created_at, organization_id")
  .eq("id", parsed.data)
  .maybeSingle();
if (!data) return json({ error: "not_found" }, 404);

let org = null;
if (data.organization_id) {
  const { data: o } = await supabase
    .from("organizations")
    .select("name, logo_url, primary_color")
    .eq("id", data.organization_id)
    .maybeSingle();
  org = o;
}
const { organization_id, ...safe } = data;
return json({ ...safe, organization: org });
```

```ts
// AssetPublicView.tsx
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

queryFn: async () => {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/get-public-asset?id=${id}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  if (!r.ok) throw new Error("not_found");
  return r.json();
}
```

## Resultado

- Qualquer pessoa que escanear o QR Code (logada ou não, no celular) verá uma tela mobile-friendly com os dados do patrimônio e a marca da organização.
- A tabela `patrimonio` continua protegida por RLS — apenas a edge function expõe campos selecionados.
