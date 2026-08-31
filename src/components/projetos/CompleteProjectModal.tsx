import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const SIZE_DEFAULTS: Record<string, number> = {
  pequeno: 300,
  medio: 500,
  grande: 800,
};

const SIZE_LABEL: Record<string, string> = {
  pequeno: "Pequeno porte",
  medio: "Médio porte",
  grande: "Grande porte",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  initialSize?: string | null;
  initialValue?: number | null;
}

export default function CompleteProjectModal({ open, onOpenChange, projectId, initialSize, initialValue }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const members = useOrgProfiles();
  const [size, setSize] = useState<string>(initialSize || "medio");
  const [value, setValue] = useState<string>(initialValue != null ? String(initialValue) : "");
  const [credited, setCredited] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSize(initialSize || "medio");
    setValue(initialValue != null ? String(initialValue) : "");
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("owner_id, co_owner_id")
        .eq("id", projectId)
        .maybeSingle();
      const { data: existing } = await supabase
        .from("project_credits")
        .select("user_id")
        .eq("project_id", projectId);
      const preset = (existing || []).map((c: any) => c.user_id as string);
      if (preset.length > 0) {
        setCredited(preset);
      } else {
        setCredited(
          [data?.owner_id, (data as any)?.co_owner_id].filter(Boolean) as string[]
        );
      }
    })();
  }, [open, projectId, initialSize, initialValue]);

  const toggleCredit = (uid: string) =>
    setCredited((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));

  const handleSizeChange = (s: string) => {
    setSize(s);
    // Não sobrescreve o valor digitado pelo usuário — mantém o que está no campo.
  };

  const handleConfirm = async () => {
    setSaving(true);
    const trimmed = value.trim();
    const parsed = trimmed === "" ? NaN : parseFloat(trimmed.replace(",", "."));
    const finalValue = isNaN(parsed) ? SIZE_DEFAULTS[size] ?? null : parsed;
    const { error } = await supabase
      .from("projects")
      .update({
        status: "Concluído",
        size,
        value_brl: finalValue,
        completed_at: new Date().toISOString(),
        completed_by: user?.id ?? null,
      })
      .eq("id", projectId);
    if (error) {
      setSaving(false);
      toast.error("Erro ao concluir: " + error.message);
      return;
    }
    try {
      await saveProjectCredits(projectId, credited, profile?.organization_id ?? null);
    } catch (e: any) {
      toast.error("Projeto concluído, mas não foi possível salvar os créditos: " + e.message);
    }
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["project"] });
    queryClient.invalidateQueries({ queryKey: ["project-credits"] });
    queryClient.invalidateQueries({ queryKey: ["completed-projects"] });
    queryClient.invalidateQueries({ queryKey: ["metas-tecnicos"] });
    toast.success("Projeto concluído!");
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir projeto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Porte do projeto</Label>
            <Select value={size} onValueChange={handleSizeChange}>
              <SelectTrigger>
                <SelectValue>{SIZE_LABEL[size] || size}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SIZE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v} (sugerido R$ {SIZE_DEFAULTS[k].toLocaleString("pt-BR")})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Sugerido: ${SIZE_DEFAULTS[size]?.toLocaleString("pt-BR") ?? "0"}`}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar o valor sugerido do porte selecionado (R$ {SIZE_DEFAULTS[size]?.toLocaleString("pt-BR") ?? "0"}).
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Concluindo..." : "Concluir projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { SIZE_LABEL, SIZE_DEFAULTS };
