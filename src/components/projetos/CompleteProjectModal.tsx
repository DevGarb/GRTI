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
  pequeno: 5000,
  medio: 15000,
  grande: 50000,
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [size, setSize] = useState<string>(initialSize || "medio");
  const [value, setValue] = useState<string>(
    initialValue != null ? String(initialValue) : String(SIZE_DEFAULTS[initialSize || "medio"])
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSize(initialSize || "medio");
      setValue(initialValue != null ? String(initialValue) : String(SIZE_DEFAULTS[initialSize || "medio"]));
    }
  }, [open, initialSize, initialValue]);

  const handleSizeChange = (s: string) => {
    setSize(s);
    setValue(String(SIZE_DEFAULTS[s] ?? 0));
  };

  const handleConfirm = async () => {
    setSaving(true);
    const numericValue = parseFloat(value.replace(",", "."));
    const { error } = await supabase
      .from("projects")
      .update({
        status: "Concluído",
        size,
        value_brl: isNaN(numericValue) ? null : numericValue,
        completed_at: new Date().toISOString(),
        completed_by: user?.id ?? null,
      })
      .eq("id", projectId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao concluir: " + error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["project"] });
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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">Valor editável — ajuste conforme o projeto.</p>
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
