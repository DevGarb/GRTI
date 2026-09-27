import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { type MaintenanceMaterial } from "@/lib/maintenancePlanning";

export default function MaintenanceMaterials({ items, onChange, readOnly = false }: {
  items: MaintenanceMaterial[];
  onChange: (items: MaintenanceMaterial[]) => void;
  readOnly?: boolean;
}) {
  const change = (index: number, patch: Partial<MaintenanceMaterial>) =>
    onChange(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Materiais necessários</span>
        {!readOnly && <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, { name: "", quantity: "1", purchased: false }])}>
          <Plus className="h-4 w-4 mr-1" /> Material
        </Button>}
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <Input aria-label={`Material ${index + 1}`} placeholder="Nome do material" value={item.name} disabled={readOnly} onChange={e => change(index, { name: e.target.value })} className="min-w-36 flex-1" />
          <Input aria-label={`Quantidade do material ${index + 1}`} placeholder="Qtd." value={item.quantity} disabled={readOnly} onChange={e => change(index, { quantity: e.target.value })} className="w-20" />
          <label className="flex items-center gap-1 text-xs whitespace-nowrap">
            <Checkbox checked={item.purchased} disabled={readOnly} onCheckedChange={checked => change(index, { purchased: checked === true })} /> Comprado
          </label>
          {!readOnly && <Button type="button" size="icon" variant="ghost" aria-label={`Remover material ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ))}
      {!items.length && <p className="text-xs text-muted-foreground">Nenhum material informado.</p>}
    </div>
  );
}