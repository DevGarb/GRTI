import { useState } from "react";
import { X, Camera, Loader2, Trash2 } from "lucide-react";
import { useUpdatePatrimonio, type CreatePatrimonioInput, type PatrimonioItem } from "@/hooks/usePatrimonio";
import { useSectors } from "@/hooks/useSectors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  patrimonio: PatrimonioItem;
  onClose: () => void;
}

const equipmentTypes = ["Desktop", "Notebook", "Impressora", "Servidor", "Switch", "Roteador", "Nobreak", "Monitor", "Telefone IP", "Outro"];
const statusOptions = ["Ativo", "Em manutenção", "Inativo", "Descartado"];

export default function EditPatrimonioModal({ patrimonio, onClose }: Props) {
  const { profile } = useAuth();
  const { data: sectors = [] } = useSectors(profile?.organization_id || null);
  const updatePatrimonio = useUpdatePatrimonio();

  const [assetTag, setAssetTag] = useState(patrimonio.asset_tag);
  const [equipmentType, setEquipmentType] = useState(patrimonio.equipment_type);
  const [brand, setBrand] = useState(patrimonio.brand || "");
  const [model, setModel] = useState(patrimonio.model || "");
  const [serialNumber, setSerialNumber] = useState(patrimonio.serial_number || "");
  const [sector, setSector] = useState(patrimonio.sector || "");
  const [responsible, setResponsible] = useState(patrimonio.responsible || "");
  const [location, setLocation] = useState(patrimonio.location || "");
  const [notes, setNotes] = useState(patrimonio.notes || "");
  const [status, setStatus] = useState(patrimonio.status);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(patrimonio.photo_url || null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return removePhoto ? null : patrimonio.photo_url || null;
    const ext = photoFile.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("patrimonio-photos").upload(path, photoFile);
    if (error) throw error;
    const { data } = supabase.storage.from("patrimonio-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!assetTag.trim() || !equipmentType) return;
    setUploading(true);
    try {
      const photoUrl = await uploadPhoto();
      updatePatrimonio.mutate(
        {
          id: patrimonio.id,
          asset_tag: assetTag.trim(),
          equipment_type: equipmentType,
          brand: brand.trim(),
          model: model.trim(),
          serial_number: serialNumber.trim(),
          sector,
          responsible: responsible.trim(),
          location: location.trim(),
          notes: notes.trim() || undefined,
          status,
          photo_url: photoUrl,
        },
        { onSuccess: () => onClose() }
      );
    } catch (e: any) {
      toast.error("Erro ao enviar foto: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-auto animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Editar Patrimônio</h2>
            <p className="text-[12px] text-muted-foreground">Atualize os dados do equipamento.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Photo */}
          <div>
            <label className="text-sm font-medium text-foreground">Foto do Equipamento</label>
            <div className="mt-1.5 flex items-center gap-4">
              {photoPreview && !removePhoto ? (
                <img src={photoPreview} alt="Foto" className="h-20 w-20 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                  <Camera className="h-4 w-4" />
                  {photoPreview && !removePhoto ? "Trocar" : "Selecionar"}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
                {photoPreview && !removePhoto && (
                  <button
                    type="button"
                    onClick={() => { setRemovePhoto(true); setPhotoFile(null); setPhotoPreview(null); }}
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                  >
                    <Trash2 className="h-3 w-3" /> Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Patrimônio (TAG) *</label>
              <input value={assetTag} onChange={(e) => setAssetTag(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo *</label>
              <select value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground">
                {equipmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Marca</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Dell, HP" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Modelo</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: OptiPlex 7080" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Número de Série</label>
            <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Setor</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground">
                <option value="">Selecione...</option>
                {sectors.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Responsável</label>
              <input value={responsible} onChange={(e) => setResponsible(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Localização</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sala, andar..." className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground">
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Observações</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={!assetTag.trim() || !equipmentType || updatePatrimonio.isPending || uploading}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
          >
            {(updatePatrimonio.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
            {updatePatrimonio.isPending || uploading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
