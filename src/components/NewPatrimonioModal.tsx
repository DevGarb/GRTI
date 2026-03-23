import { useState } from "react";
import { X, Camera, Loader2, Video } from "lucide-react";
import { useCreatePatrimonio, type CreatePatrimonioInput } from "@/hooks/usePatrimonio";
import { useSectors } from "@/hooks/useSectors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CameraCaptureModal from "@/components/CameraCaptureModal";

interface Props {
  onClose: () => void;
}

const equipmentTypes = ["Desktop", "Notebook", "Impressora", "Servidor", "Switch", "Roteador", "Nobreak", "Monitor", "Telefone IP", "Outro"];
const statusOptions = ["Ativo", "Em manutenção", "Inativo", "Descartado"];

export default function NewPatrimonioModal({ onClose }: Props) {
  const { profile } = useAuth();
  const { data: sectors = [] } = useSectors(profile?.organization_id || null);
  const createPatrimonio = useCreatePatrimonio();

  const [assetTag, setAssetTag] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [sector, setSector] = useState("");
  const [responsible, setResponsible] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Ativo");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleCameraCapture = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
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
      createPatrimonio.mutate(
        {
          asset_tag: assetTag.trim(),
          equipment_type: equipmentType,
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          serial_number: serialNumber.trim() || undefined,
          sector: sector || undefined,
          responsible: responsible.trim() || undefined,
          location: location.trim() || undefined,
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
            <h2 className="text-lg font-semibold text-foreground">Novo Patrimônio</h2>
            <p className="text-[12px] text-muted-foreground">Cadastre um equipamento no inventário.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Photo upload */}
          <div>
            <label className="text-sm font-medium text-foreground">Foto do Equipamento</label>
            <div className="mt-1.5 flex items-center gap-4">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-20 w-20 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <Camera className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                    <Camera className="h-4 w-4" />
                    {photoFile ? "Trocar" : "Arquivo"}
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Video className="h-4 w-4" />
                    Câmera
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">JPG, PNG até 5MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Patrimônio (TAG) *</label>
              <input
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                placeholder="Ex: NB-00123"
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo *</label>
              <select
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option value="">Selecione...</option>
                {equipmentTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Marca</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Dell, HP, Lenovo" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Modelo</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: OptiPlex 7080" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Número de Série</label>
            <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="S/N do equipamento" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Setor</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground">
                <option value="">Selecione...</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Responsável</label>
              <input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nome do responsável" className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Localização</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sala, andar, prédio..." className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground">
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Observações</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações adicionais..." className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={!assetTag.trim() || !equipmentType || createPatrimonio.isPending || uploading}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
          >
            {(createPatrimonio.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
            {createPatrimonio.isPending || uploading ? "Salvando..." : "Cadastrar"}
          </button>
        </div>
      </div>
      {showCamera && <CameraCaptureModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
}
