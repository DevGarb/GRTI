import { useState, useRef } from "react";
import { X, Ticket, Upload, Trash2, Image } from "lucide-react";
import { useCreateTicket, useTechnicianProfiles } from "@/hooks/useTickets";
import { useSectors } from "@/hooks/useSectors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

interface PendingFile {
  file: File;
  preview: string;
}

export default function NewTicketModal({ onClose }: Props) {
  const { profile, user } = useAuth();
  const { data: sectors = [] } = useSectors(profile?.organization_id || null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Média");
  const [type, setType] = useState("Software");
  const [assignedTo, setAssignedTo] = useState("");
  const [sector, setSector] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createTicket = useCreateTicket();
  const { data: profiles = [] } = useTechnicianProfiles();

  const addFiles = (files: FileList | File[]) => {
    const newFiles: PendingFile[] = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length) addFiles(imageFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !assignedTo) return;
    setIsSubmitting(true);
    try {
      // Create ticket first
      const ticketData = await new Promise<any>((resolve, reject) => {
        createTicket.mutate(
          { title, description, priority, type, assigned_to: assignedTo || null, sector: sector || null },
          { onSuccess: (data) => resolve(data), onError: reject }
        );
      });

      const ticketId = ticketData?.id || ticketData?.[0]?.id;

      // Upload attachments
      if (ticketId && pendingFiles.length > 0) {
        for (const pf of pendingFiles) {
          const ext = pf.file.name.split(".").pop() || "bin";
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const path = `tickets/${ticketId}/${fileName}`;

          const { data, error } = await supabase.storage
            .from("attachments")
            .upload(path, pf.file);

          if (error) {
            console.error("Upload error:", error);
            continue;
          }

          const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(data.path);

          await supabase.from("ticket_attachments").insert({
            ticket_id: ticketId,
            file_url: urlData.publicUrl,
            file_name: pf.file.name,
          });
        }
      }

      toast.success("Chamado criado com sucesso!");
      onClose();
    } catch (err) {
      console.error("Error creating ticket:", err);
      toast.error("Erro ao criar chamado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-xl border border-border w-full max-w-lg mx-4 max-h-[90vh] overflow-auto animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Novo Chamado</h2>
              <p className="text-[12px] text-muted-foreground">Descreva o problema ou solicitação.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo do problema"
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Descrição *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={handlePaste}
              rows={4}
              placeholder="Descreva detalhadamente..."
              className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Prioridade *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option>Média</option>
                <option>Urgente</option>
                <option>Alta</option>
                <option>Baixa</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Tipo *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option>Software</option>
                <option>Hardware</option>
              </select>
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
              <label className="text-sm font-medium text-foreground">Técnico Responsável *</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
              >
                <option value="">Selecione o técnico...</option>
                {profiles.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File upload area */}
          <div>
            <label className="text-sm font-medium text-foreground">Anexos (opcional)</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`mt-1.5 border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"
              }`}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground text-center">
                Clique para selecionar, arraste ou cole uma imagem (Ctrl+V)
              </span>
            </div>

            {/* Preview of pending files */}
            {pendingFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {pendingFiles.map((pf, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                    {pf.preview ? (
                      <img src={pf.preview} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-xs text-foreground flex-1 truncate">{pf.file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            disabled={isSubmitting || createTicket.isPending || !title.trim() || !assignedTo}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? "Criando..." : "Criar Chamado"}
          </button>
        </div>
      </div>
    </div>
  );
}
