import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

interface ParsedRow {
  asset_tag: string;
  equipment_type: string;
  brand: string;
  model: string;
  serial_number: string;
  sector: string;
  responsible: string;
  location: string;
  status: string;
  notes: string;
  valid: boolean;
  error?: string;
}

const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  tag: "asset_tag",
  patrimonio: "asset_tag",
  patrimônio: "asset_tag",
  asset_tag: "asset_tag",
  tipo: "equipment_type",
  type: "equipment_type",
  equipment_type: "equipment_type",
  marca: "brand",
  brand: "brand",
  modelo: "model",
  model: "model",
  serie: "serial_number",
  "nº série": "serial_number",
  "numero serie": "serial_number",
  "número série": "serial_number",
  serial_number: "serial_number",
  serial: "serial_number",
  setor: "sector",
  sector: "sector",
  responsavel: "responsible",
  responsável: "responsible",
  responsible: "responsible",
  localizacao: "location",
  localização: "location",
  location: "location",
  status: "status",
  observacoes: "notes",
  observações: "notes",
  notes: "notes",
  obs: "notes",
};

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  // Detect delimiter
  const firstLine = lines[0] || "";
  const delimiter = firstLine.includes(";") ? ";" : ",";
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += char;
    }
    result.push(current.trim());
    return result;
  });
}

export default function ImportPatrimonioModal({ onClose }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast.error("Arquivo vazio ou sem dados.");
        return;
      }

      const headers = parsed[0].map((h) => h.toLowerCase().replace(/[^a-zà-ú_\s]/gi, "").trim());
      const columnIndexes: Partial<Record<keyof ParsedRow, number>> = {};
      headers.forEach((h, i) => {
        const mapped = COLUMN_MAP[h];
        if (mapped) columnIndexes[mapped] = i;
      });

      if (columnIndexes.asset_tag === undefined || columnIndexes.equipment_type === undefined) {
        toast.error("Colunas obrigatórias não encontradas: TAG e Tipo são obrigatórios.");
        return;
      }

      const dataRows = parsed.slice(1).map((cols): ParsedRow => {
        const get = (key: keyof ParsedRow) => {
          const idx = columnIndexes[key];
          return idx !== undefined ? (cols[idx] || "").trim() : "";
        };
        const asset_tag = get("asset_tag");
        const equipment_type = get("equipment_type");
        const valid = !!asset_tag && !!equipment_type;
        return {
          asset_tag,
          equipment_type,
          brand: get("brand"),
          model: get("model"),
          serial_number: get("serial_number"),
          sector: get("sector"),
          responsible: get("responsible"),
          location: get("location"),
          status: get("status") || "Ativo",
          notes: get("notes"),
          valid,
          error: !valid ? "TAG e Tipo são obrigatórios" : undefined,
        };
      });

      setRows(dataRows);
      setStep("preview");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    setStep("importing");
    let success = 0;
    let failed = 0;
    const validRows = rows.filter((r) => r.valid);

    // Batch insert
    const batch = validRows.map((r) => ({
      asset_tag: r.asset_tag,
      equipment_type: r.equipment_type,
      brand: r.brand || "",
      model: r.model || "",
      serial_number: r.serial_number || "",
      sector: r.sector || "",
      responsible: r.responsible || "",
      location: r.location || "",
      status: r.status || "Ativo",
      notes: r.notes || null,
      created_by: user!.id,
      organization_id: profile?.organization_id || null,
    }));

    // Insert in chunks of 50
    for (let i = 0; i < batch.length; i += 50) {
      const chunk = batch.slice(i, i + 50);
      const { error } = await supabase.from("patrimonio").insert(chunk);
      if (error) {
        failed += chunk.length;
      } else {
        success += chunk.length;
      }
    }

    failed += rows.filter((r) => !r.valid).length;
    setResults({ success, failed });
    queryClient.invalidateQueries({ queryKey: ["patrimonio"] });
    setStep("done");
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Importar Patrimônios</h2>
            <p className="text-[12px] text-muted-foreground">Importe equipamentos a partir de uma planilha CSV.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-input rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo CSV</p>
                <p className="text-xs text-muted-foreground">Suporta delimitadores vírgula (,) e ponto-e-vírgula (;)</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium text-foreground mb-2">Colunas esperadas:</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span><strong className="text-foreground">TAG *</strong> — Nº patrimônio</span>
                  <span><strong className="text-foreground">Tipo *</strong> — Tipo equipamento</span>
                  <span>Marca — Fabricante</span>
                  <span>Modelo — Modelo</span>
                  <span>Nº Série — Serial</span>
                  <span>Setor — Setor</span>
                  <span>Responsável — Responsável</span>
                  <span>Localização — Sala/andar</span>
                  <span>Status — Ativo/Inativo</span>
                  <span>Observações — Notas</span>
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-foreground font-medium">{validCount} válidos</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive font-medium">{invalidCount} inválidos</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">Total: {rows.length} linhas</span>
              </div>

              <div className="max-h-[300px] overflow-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">TAG</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Marca</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Modelo</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Setor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r, i) => (
                      <tr key={i} className={`border-t border-border/50 ${!r.valid ? "bg-destructive/5" : ""}`}>
                        <td className="py-1.5 px-2">
                          {r.valid ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-foreground">{r.asset_tag || "—"}</td>
                        <td className="py-1.5 px-2 text-foreground">{r.equipment_type || "—"}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{r.brand || "—"}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{r.model || "—"}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{r.sector || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 100 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Mostrando 100 de {rows.length} linhas</p>
                )}
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="py-10 flex flex-col items-center gap-3">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Importando {validCount} patrimônios...</p>
            </div>
          )}

          {step === "done" && (
            <div className="py-8 flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-lg font-semibold text-foreground">Importação Concluída</p>
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-600">{results.success} importados</span>
                {results.failed > 0 && <span className="text-destructive">{results.failed} falharam</span>}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          {step === "preview" && (
            <>
              <button onClick={() => { setStep("upload"); setRows([]); }} className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors">Voltar</button>
              <button
                onClick={handleImport}
                disabled={validCount === 0}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Importar {validCount} patrimônios
              </button>
            </>
          )}
          {(step === "upload" || step === "done") && (
            <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors">
              {step === "done" ? "Fechar" : "Cancelar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
