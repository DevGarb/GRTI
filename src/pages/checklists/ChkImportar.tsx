import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Upload, FileJson, Loader2, CheckCircle2, ListChecks } from "lucide-react";

const GRCHECK_SLUG = "grcheck";
const BATCH = 500;

type RawOption = { id: number; text: string; value: number | null };
type RawItem = { id: number; name: string; required?: boolean; scale?: number | null; weight?: number | null; options?: RawOption[] };
type RawCategory = { id: number; name: string; description?: string | null; parent?: number | { id: number } | null; items?: RawItem[] };
type RawChecklist = { id: number; name: string; type?: number; description?: string | null; active?: boolean; categories?: RawCategory[] };

type Counts = { checklists: number; categories: number; items: number; options: number };

const TYPE_LABEL: Record<number, string> = {
  1: "Checklist",
  2: "Pesquisa de Satisfação",
  3: "Plano de Ação Avulso",
};

function validate(data: unknown): { ok: true; data: RawChecklist[] } | { ok: false; error: string } {
  if (!Array.isArray(data)) return { ok: false, error: "O arquivo precisa conter uma lista de checklists." };
  if (data.length === 0) return { ok: false, error: "O arquivo está vazio." };
  for (const c of data as RawChecklist[]) {
    if (typeof c?.id !== "number" || typeof c?.name !== "string") {
      return { ok: false, error: "Estrutura inválida: cada checklist precisa de 'id' numérico e 'name'." };
    }
  }
  return { ok: true, data: data as RawChecklist[] };
}

function countAll(list: RawChecklist[]): Counts {
  let categories = 0, items = 0, options = 0;
  for (const c of list) {
    for (const cat of c.categories || []) {
      categories++;
      for (const it of cat.items || []) {
        items++;
        options += (it.options || []).length;
      }
    }
  }
  return { checklists: list.length, categories, items, options };
}

async function upsertInBatches(table: string, rows: any[], onProgress: (n: number) => void) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await (supabase.from(table as any) as any).upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(`${table}: ${error.message}`);
    onProgress(chunk.length);
  }
}

export default function ChkImportar() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<RawChecklist[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ counts: Counts; templates: number } | null>(null);
  const [existing, setExisting] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState<number | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => (parsed ? countAll(parsed) : null), [parsed]);

  const loadExisting = async (org: string) => {
    const { data } = await (supabase.from("chk_imp_checklists" as any) as any)
      .select("id, name, type, active, description")
      .eq("organization_id", org)
      .order("name");
    setExisting(data || []);
  };

  useEffect(() => {
    supabase
      .from("organizations")
      .select("id")
      .eq("slug", GRCHECK_SLUG)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) {
          setOrgId(data.id);
          loadExisting(data.id);
        }
      });
  }, []);

  const handleFile = async (f: File) => {
    setResult(null);
    setFile(f);
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      const res = validate(json);
      if (res.ok === false) {
        setParsed(null);
        toast({ title: "Arquivo inválido", description: res.error, variant: "destructive" });
        return;
      }
      setParsed(res.data);
    } catch {
      setParsed(null);
      toast({ title: "Arquivo inválido", description: "Não foi possível ler o JSON.", variant: "destructive" });
    }
  };

  const runImport = async () => {
    if (!parsed || !orgId) return;
    setRunning(true);
    setProgress(0);
    setResult(null);
    try {
      const checklists: any[] = [];
      const catsRoot: any[] = [];
      const catsChild: any[] = [];
      const items: any[] = [];
      const options: any[] = [];

      // O JSON pode trazer referências como objeto ({id, name, ...}) ou como número.
      const toId = (v: any): number | null => {
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "object") return toId((v as any).id);
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      parsed.forEach((c) => {
        const checklistId = toId(c.id);
        checklists.push({
          id: checklistId,
          organization_id: orgId,
          name: c.name,
          type: c.type ?? 1,
          description: c.description ?? null,
          active: c.active ?? true,
        });
        (c.categories || []).forEach((cat, ci) => {
          const catId = toId(cat.id);
          const parentId = toId((cat as any).parent);
          const row = {
            id: catId,
            checklist_id: checklistId,
            organization_id: orgId,
            name: cat.name,
            description: cat.description ?? null,
            parent_id: parentId,
            sort_order: ci,
          };
          (parentId ? catsChild : catsRoot).push(row);
          (cat.items || []).forEach((it, ii) => {
            const itemId = toId(it.id);
            items.push({
              id: itemId,
              category_id: catId,
              organization_id: orgId,
              name: it.name,
              required: it.required ?? false,
              scale: it.scale ?? null,
              weight: it.weight ?? 1,
              sort_order: ii,
            });
            (it.options || []).forEach((op, oi) => {
              options.push({
                id: toId(op.id),
                item_id: itemId,
                organization_id: orgId,
                text: op.text == null || String(op.text).trim() === "" ? "(sem texto)" : String(op.text),
                value: op.value ?? null,
                sort_order: oi,
              });
            });
          });
        });
      });

      // Evita violação de FK quando o "parent" aponta para uma categoria fora do arquivo.
      const knownCatIds = new Set([...catsRoot, ...catsChild].map((r) => r.id));
      catsChild.forEach((r) => {
        if (!knownCatIds.has(r.parent_id)) r.parent_id = null;
      });

      const total = checklists.length + catsRoot.length + catsChild.length + items.length + options.length;
      let done = 0;
      const bump = (n: number) => {
        done += n;
        setProgress(Math.round((done / total) * 100));
      };

      await upsertInBatches("chk_imp_checklists", checklists, bump);
      await upsertInBatches("chk_imp_categories", catsRoot, bump);
      await upsertInBatches("chk_imp_categories", catsChild, bump);
      await upsertInBatches("chk_imp_items", items, bump);
      await upsertInBatches("chk_imp_item_options", options, bump);

      const { data: templates, error: rpcError } = await (supabase.rpc as any)("chk_import_generate_templates", {
        _organization_id: orgId,
      });
      if (rpcError) throw new Error(rpcError.message);

      setProgress(100);
      setResult({ counts: countAll(parsed), templates: Number(templates) || 0 });
      await loadExisting(orgId);
      toast({ title: "Importação concluída", description: `${checklists.length} checklists processados.` });
    } catch (e: any) {
      toast({ title: "Falha na importação", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const filtered = existing.filter((c) => typeFilter === "all" || c.type === typeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar Checklists</h1>
        <p className="text-sm text-muted-foreground">
          Envie o arquivo JSON exportado para carregar checklists, categorias, itens e opções.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arquivo JSON</CardTitle>
          <CardDescription>O arquivo não é armazenado — apenas os dados extraídos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">Clique ou arraste o arquivo .json aqui</p>
            {file && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileJson className="h-3 w-3" /> {file.name}
              </p>
            )}
          </div>
          <Input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {counts && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Checklists", counts.checklists],
                ["Categorias", counts.categories],
                ["Itens", counts.items],
                ["Opções", counts.options],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-semibold">{value as number}</p>
                </div>
              ))}
            </div>
          )}

          {running && <Progress value={progress} />}

          <Button onClick={runImport} disabled={!parsed || !orgId || running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {running ? `Importando... ${progress}%` : "Importar"}
          </Button>

          {result && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-1">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Importação concluída
              </p>
              <p>
                {result.counts.checklists} checklists, {result.counts.categories} categorias, {result.counts.items} itens e{" "}
                {result.counts.options} opções gravados/atualizados.
              </p>
              <p className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-muted-foreground" /> {result.templates} modelos gerados/atualizados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">Checklists importados</CardTitle>
            <CardDescription>{filtered.length} registro(s)</CardDescription>
          </div>
          <div className="flex gap-1">
            {([["all", "Todos"], [1, "Checklist"], [2, "Pesquisa"], [3, "Plano de Ação"]] as const).map(([v, label]) => (
              <Button
                key={String(v)}
                size="sm"
                variant={typeFilter === v ? "default" : "outline"}
                onClick={() => setTypeFilter(v as any)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum checklist importado ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      #{c.id} · {TYPE_LABEL[c.type] || "Outro"}
                      {c.description ? ` · ${c.description}` : ""}
                    </p>
                  </div>
                  <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Ativo" : "Inativo"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
