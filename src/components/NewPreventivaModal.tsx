import { useState, useRef } from "react";
import { X, Camera, Upload } from "lucide-react";
import { useCreatePreventiva } from "@/hooks/usePreventivas";
import { useSectors } from "@/hooks/useSectors";
import { useTechnicianProfiles } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

const checklistItems = [
  "Limpeza Interna",
  "Verificação HD/SSD",
  "Limpeza Teclado",
  "Teste Bateria (Notebook)",
  "Atualização SO",
  "Pasta Térmica",
  "Teste RAM",
  "Verificação Tela",
  "Verificação Fonte",
  "Teste Periféricos",
  "Verificação Rede",
  "Antivírus/Segurança",
];

export default function NewPreventivaModal({ onClose }: Props) {
  const { profile } = useAuth();
  const { data: sectors = [] } = useSectors(profile?.organization_id || null);
  const { data: technicians = [] } = useTechnicianProfiles();
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [equipmentType, setEquipmentType] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [sector, setSector] = useState("");
  const [responsible, setResponsible] = useState("");
  const [executionDate, setExecutionDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [customItem, setCustomItem] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const createPreventiva = useCreatePreventiva();

  const toggle = (item: string) =>
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    checklistItems.forEach((item) => (all[item] = true));
    Object.keys(checklist).forEach((item) => (all[item] = true));
    setChecklist(all);
  };

  const clearAll = () => setChecklist({});

  const addCustomItem = () => {
    if (customItem.trim()) {
      setChecklist((prev) => ({ ...prev, [customItem.trim()]: false }));
      setCustomItem("");
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - photos.length);
    setPhotos((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotoUrls((prev) => [...prev, url]);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!equipmentType || !assetTag) return;
    if (photos.length < 4) {
      toast.error("É necessário anexar no mínimo 4 fotos do equipamento.");
      return;
    }

    // Upload photos
    const uploadedUrls: string[] = [];
    for (const photo of photos) {
      const fileName = `preventivas/${assetTag}/${Date.now()}-${photo.name}`;
      const { data, error } = await supabase.storage
        .from("attachments")
        .upload(fileName, photo);
      if (error) {
        toast.error("Erro ao enviar foto: " + error.message);
        return;
      }
      const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(data.path);
      uploadedUrls.push(urlData.publicUrl);
    }

    const notesWithPhotos = uploadedUrls.length > 0
      ? `${notes}\n\n📷 Fotos: ${uploadedUrls.join(" | ")}`
      : notes;

    createPreventiva.mutate(
      {
        equipment_type: equipmentType,
        asset_tag: assetTag,
        execution_date: executionDate,
        checklist,
        notes: notesWithPhotos,
        sector: sector || undefined,
        responsible: responsible || undefined,
      },
      { onSuccess: () => onClose() }
    );
  };

  const checked = Object.values(checklist).filter(Boolean).length;
  const total = Object.keys(checklist).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-auto animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Nova Manutenção Preventiva</h2>
            <p className="text-[12px] text-muted-foreground">Registre a manutenção realizada no equipamento.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Tipo de Equipamento *</label>
              <select
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option value="">Selecione...</option>
                <option>Desktop</option>
                <option>Notebook</option>
                <option>Impressora</option>
                <option>Servidor</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Patrimônio *</label>
              <input
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                placeholder="Ex: NB-00123"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Setor</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option value="">Selecione o setor...</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Responsável</label>
              <input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Nome do responsável..."
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Data de Execução</label>
            <input
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground">
                Checklist de Verificação
                {total > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">({checked}/{total})</span>
                )}
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-[11px] text-primary hover:underline">Marcar todos</button>
                <button type="button" onClick={clearAll} className="text-[11px] text-muted-foreground hover:underline">Limpar</button>
              </div>
            </div>
            <div className="border border-input rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {[...checklistItems, ...Object.keys(checklist).filter((k) => !checklistItems.includes(k))].map((item) => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer group">
                    <div
                      onClick={() => toggle(item)}
                      className={`h-4 w-4 rounded border-2 transition-all flex items-center justify-center shrink-0 ${
                        checklist[item]
                          ? "bg-primary border-primary"
                          : "border-input group-hover:border-primary/50"
                      }`}
                    >
                      {checklist[item] && (
                        <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-[12px] ${checklist[item] ? "text-foreground" : "text-muted-foreground"}`}>{item}</span>
                  </label>
                ))}
              </div>
              {/* Custom item input */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <input
                  value={customItem}
                  onChange={(e) => setCustomItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomItem())}
                  placeholder="Adicionar item personalizado..."
                  className="flex-1 px-2.5 py-1.5 rounded border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomItem}
                  disabled={!customItem.trim()}
                  className="text-xs px-2.5 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              Fotos do Equipamento <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground ml-1">(mínimo 4)</span>
            </label>
            <div className="mt-1.5 space-y-2">
              {photoUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Foto ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border border-border" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-input hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Clique para adicionar fotos ({photos.length}/5)
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Observações</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais..."
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!equipmentType || !assetTag || photos.length < 4 || createPreventiva.isPending}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createPreventiva.isPending ? "Salvando..." : "Registrar Preventiva"}
          </button>
        </div>
      </div>
    </div>
  );
}
