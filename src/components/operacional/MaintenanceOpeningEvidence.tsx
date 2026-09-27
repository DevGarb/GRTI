import { useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function MaintenanceOpeningEvidence({ photos, onPhotosChange, justification, onJustificationChange }: {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  justification: string;
  onJustificationChange: (value: string) => void;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const add = (files: File[]) => {
    const images = files.filter(f => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
    onPhotosChange([...photos, ...images]);
    setPreviews(prev => [...prev, ...images.map(f => URL.createObjectURL(f))]);
  };
  return <div className="space-y-3">
    <Label>Foto da manutenção solicitada *</Label>
    <div className="flex flex-wrap gap-2">
      <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><Camera className="h-4 w-4" /> Tirar foto<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { add(Array.from(e.target.files || [])); e.target.value = ""; }} /></label>
      <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">Escolher fotos<input type="file" accept="image/*" multiple className="sr-only" onChange={e => { add(Array.from(e.target.files || [])); e.target.value = ""; }} /></label>
    </div>
    {photos.length > 0 && <div className="flex gap-2 flex-wrap">{photos.map((f, i) => <div key={`${f.name}-${i}`} className="relative"><img src={previews[i]} alt={f.name} className="h-20 w-20 object-cover rounded border" /><Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" aria-label={`Remover foto ${i + 1}`} onClick={() => { URL.revokeObjectURL(previews[i]); onPhotosChange(photos.filter((_, j) => j !== i)); setPreviews(previews.filter((_, j) => j !== i)); }}><X className="h-3 w-3" /></Button></div>)}</div>}
    {photos.length === 0 && <div><Label>Sem foto, informe a justificativa *</Label><Textarea maxLength={1000} value={justification} onChange={e => onJustificationChange(e.target.value)} placeholder="Por que não foi possível fotografar a manutenção?" /></div>}
  </div>;
}