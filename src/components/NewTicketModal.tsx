import { useState } from "react";
import { X, Ticket, Upload } from "lucide-react";
import { useCreateTicket, useTechnicianProfiles } from "@/hooks/useTickets";
import { useSectors } from "@/hooks/useSectors";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onClose: () => void;
}

export default function NewTicketModal({ onClose }: Props) {
  const { profile } = useAuth();
  const { data: sectors = [] } = useSectors(profile?.organization_id || null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Média");
  const [type, setType] = useState("Software");
  const [assignedTo, setAssignedTo] = useState("");
  const [sector, setSector] = useState("");
  const createTicket = useCreateTicket();
  const { data: profiles = [] } = useProfiles();

  const handleSubmit = () => {
    console.log("[NewTicketModal] handleSubmit called", { title, description, priority, type, assignedTo });
    if (!title.trim()) {
      console.log("[NewTicketModal] title is empty, aborting");
      return;
    }
    createTicket.mutate(
      {
        title,
        description,
        priority,
        type,
        assigned_to: assignedTo || null,
        sector: sector || null,
      },
      {
        onSuccess: () => {
          console.log("[NewTicketModal] ticket created successfully");
          onClose();
        },
        onError: (err) => {
          console.error("[NewTicketModal] error creating ticket", err);
        },
      }
    );
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
              <label className="text-sm font-medium text-foreground">Técnico Responsável</label>
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

          <div>
            <label className="text-sm font-medium text-foreground">Anexo (opcional)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
              className={`mt-1.5 border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-input"
              }`}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground text-center">
                Arraste ou cole uma imagem (Ctrl+V)
              </span>
            </div>
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
            disabled={createTicket.isPending || !title.trim()}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createTicket.isPending ? "Criando..." : "Criar Chamado"}
          </button>
        </div>
      </div>
    </div>
  );
}
