import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportResult {
  email: string;
  full_name: string;
  status: "success" | "error";
  message?: string;
}

interface ImportUsersModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect separator
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  return lines.slice(1).map((line) => {
    const values = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

function mapColumn(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (row[k]) return row[k];
  }
  return "";
}

export default function ImportUsersModal({ open, onClose, onSuccess }: ImportUsersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "results">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setRows([]);
    setResults([]);
    setStep("upload");
    setImporting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (f: File) => {
    setFile(f);
    let parsed: Record<string, string>[];

    if (f.name.endsWith(".xlsx") || f.name.endsWith(".xls")) {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      parsed = json.map((row) => {
        const normalized: Record<string, string> = {};
        Object.keys(row).forEach((k) => {
          normalized[k.trim().toLowerCase().replace(/"/g, "")] = String(row[k]).trim();
        });
        return normalized;
      });
    } else {
      const text = await f.text();
      parsed = parseCSV(text);
    }

    if (parsed.length === 0) {
      toast.error("Planilha vazia ou formato inválido.");
      return;
    }
    setRows(parsed);
    setStep("preview");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // Generates a strong random password (16 chars, mixed alphabet) when none is provided.
  const generateStrongPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    const arr = new Uint32Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (n) => chars[n % chars.length]).join("");
  };

  const getMappedUsers = () =>
    rows.map((row) => {
      const providedPwd = mapColumn(row, ["senha", "password", "pass"]);
      return {
        full_name: mapColumn(row, ["nome", "nome completo", "full_name", "name", "nome_completo"]),
        email: mapColumn(row, ["email", "e-mail", "e_mail"]),
        password: providedPwd && providedPwd.length >= 8 ? providedPwd : generateStrongPassword(),
        providedWeakPwd: !!providedPwd && providedPwd.length < 8,
        role: mapColumn(row, ["tipo", "role", "perfil", "acesso", "tipo de acesso"]).toLowerCase(),
      };
    })
    .map((u) => ({
      ...u,
      role: u.role.includes("admin") ? "admin" : u.role.includes("téc") || u.role.includes("tec") ? "tecnico" : "solicitante",
    }));

  const handleImport = async () => {
    setImporting(true);
    const mapped = getMappedUsers();
    const importResults: ImportResult[] = [];

    for (const user of mapped) {
      if (!user.email || !user.full_name) {
        importResults.push({ email: user.email || "—", full_name: user.full_name || "—", status: "error", message: "Nome ou e-mail ausente" });
        continue;
      }
      if (user.providedWeakPwd) {
        importResults.push({ email: user.email, full_name: user.full_name, status: "error", message: "Senha fraca (mínimo 8 caracteres)" });
        continue;
      }
      try {
        const res = await supabase.functions.invoke("create-user", {
          body: { email: user.email, password: user.password, full_name: user.full_name, role: user.role },
        });
        if (res.error || res.data?.error) {
          importResults.push({ email: user.email, full_name: user.full_name, status: "error", message: res.data?.error || res.error?.message });
        } else {
          importResults.push({ email: user.email, full_name: user.full_name, status: "success" });
        }
      } catch (err: any) {
        importResults.push({ email: user.email, full_name: user.full_name, status: "error", message: err.message });
      }
    }

    setResults(importResults);
    setStep("results");
    setImporting(false);

    const successCount = importResults.filter((r) => r.status === "success").length;
    if (successCount > 0) {
      toast.success(`${successCount} usuário(s) importado(s) com sucesso!`);
      onSuccess();
    }
  };

  const downloadTemplate = () => {
    // No default insecure password in the template — users should provide one (min 8 chars)
    // or leave empty to receive an auto-generated strong password.
    const csv = "nome,email,senha,tipo\nJoão Silva,joao@exemplo.com,,solicitante\nMaria Souza,maria@exemplo.com,,tecnico\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_usuarios.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const roleLabel: Record<string, string> = { admin: "Administrador", tecnico: "Técnico", solicitante: "Colaborador" };

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-lg w-full max-w-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Importar Usuários</h2>
            <p className="text-sm text-muted-foreground">
              {step === "upload" && "Envie um arquivo CSV com os dados dos usuários."}
              {step === "preview" && "Confira os dados antes de importar."}
              {step === "results" && "Resultado da importação."}
            </p>
          </div>
          <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Arraste um arquivo CSV ou Excel (.xlsx) ou clique para selecionar</span>
                <span className="text-xs text-muted-foreground">Formatos aceitos: .csv, .xlsx, .xls</span>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <Download className="h-4 w-4" />
                Baixar modelo de planilha
              </button>
              <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-sm">Colunas esperadas:</p>
                <p><strong>nome</strong> — Nome completo do usuário</p>
                <p><strong>email</strong> — E-mail de login</p>
                <p><strong>senha</strong> — Mínimo 8 caracteres. Se em branco, será gerada uma senha forte automaticamente.</p>
                <p><strong>tipo</strong> — solicitante, tecnico ou admin</p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{file?.name} — {rows.length} registro(s)</span>
              </div>
              <div className="border border-border rounded-lg overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-foreground">Nome</th>
                      <th className="text-left px-3 py-2 font-medium text-foreground">E-mail</th>
                      <th className="text-left px-3 py-2 font-medium text-foreground">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getMappedUsers().map((u, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">{u.full_name || <span className="text-destructive">Vazio</span>}</td>
                        <td className="px-3 py-2 text-foreground">{u.email || <span className="text-destructive">Vazio</span>}</td>
                        <td className="px-3 py-2 text-muted-foreground">{roleLabel[u.role] || u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "results" && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">✓ {results.filter((r) => r.status === "success").length} sucesso</span>
                <span className="text-destructive font-medium">✗ {results.filter((r) => r.status === "error").length} erro(s)</span>
              </div>
              <div className="border border-border rounded-lg overflow-auto max-h-64">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-0">
                    {r.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">{r.full_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.email}</span>
                    </div>
                    {r.message && <span className="text-xs text-destructive">{r.message}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {step === "preview" && (
            <>
              <button onClick={reset} className="px-4 py-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Voltar
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
              >
                {importing ? <><Loader2 className="h-4 w-4 animate-spin" />Importando...</> : `Importar ${rows.length} usuário(s)`}
              </button>
            </>
          )}
          {step === "results" && (
            <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
