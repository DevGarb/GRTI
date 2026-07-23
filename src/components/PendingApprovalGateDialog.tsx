import { AlertTriangle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTicketModal } from "@/contexts/TicketModalContext";
import { formatDateBR } from "@/lib/dateFormat";
import type { PendingApprovalTicket } from "@/hooks/usePendingApprovalTickets";

interface Props {
  open: boolean;
  onClose: () => void;
  tickets: PendingApprovalTicket[];
}

export default function PendingApprovalGateDialog({ open, onClose, tickets }: Props) {
  const { openTicket } = useTicketModal();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Você tem chamados aguardando aprovação
          </DialogTitle>
          <DialogDescription>
            Antes de abrir um novo chamado, aprove ou solicite retrabalho nos
            chamados abaixo. Essa regra evita acúmulo de pendências não avaliadas.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto divide-y divide-border rounded-lg border border-border">
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onClose();
                openTicket(t.id);
              }}
              className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {t.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aguardando desde{" "}
                  {formatDateBR(t.aguardando_aprovacao_at || t.created_at)}
                  {" · "}
                  <span className="font-mono">#{t.id.slice(0, 8)}</span>
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            </button>
          ))}
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Fechar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
