import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PriorityBadge } from "@/components/StatusBadge";
import { useUpdateTicket, Ticket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COLUMNS = [
  { id: "Aberto", label: "Aberto", color: "bg-red-500" },
  { id: "Em Andamento", label: "Em Andamento", color: "bg-amber-500" },
  { id: "Aguardando Aprovação", label: "Aguardando Aprovação", color: "bg-blue-500" },
  { id: "Aprovado", label: "Aprovado", color: "bg-emerald-500" },
  { id: "Disponível", label: "Disponível", color: "bg-red-600" },
  { id: "Fechado", label: "Fechado", color: "bg-primary" },
];

// Allowed transitions per role
const TECH_TRANSITIONS: Record<string, string[]> = {
  "Aberto": ["Em Andamento"],
  "Em Andamento": ["Aguardando Aprovação"],
};

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  "Aberto": ["Em Andamento", "Fechado"],
  "Em Andamento": ["Aguardando Aprovação", "Aberto", "Fechado"],
  "Aguardando Aprovação": ["Aprovado", "Em Andamento", "Aberto"],
  "Aprovado": ["Fechado", "Em Andamento"],
  "Disponível": ["Em Andamento", "Aberto", "Fechado"],
  "Fechado": ["Aberto"],
};

interface KanbanBoardProps {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
}

export default function KanbanBoard({ tickets, onSelect }: KanbanBoardProps) {
  const updateTicket = useUpdateTicket();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin");

  const grouped = COLUMNS.map((col) => ({
    ...col,
    tickets: tickets.filter((t) => t.status === col.id),
  }));

  const handleDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId;
    const ticket = tickets.find((t) => t.id === draggableId);
    if (!ticket || ticket.status === newStatus) return;

    const oldStatus = ticket.status;

    // Check allowed transitions
    const transitions = isAdmin ? ADMIN_TRANSITIONS : TECH_TRANSITIONS;
    const allowed = transitions[oldStatus] || [];
    if (!allowed.includes(newStatus)) {
      toast.error("Transição não permitida.");
      return;
    }

    // Build update payload based on transition
    const updatePayload: Record<string, unknown> = { id: draggableId, status: newStatus };

    if (oldStatus === "Aberto" && newStatus === "Em Andamento") {
      // Technician picking / starting the ticket
      updatePayload.assigned_to = user!.id;
      updatePayload.picked_at = new Date().toISOString();
      updatePayload.started_at = new Date().toISOString();
    }

    updateTicket.mutate(
      updatePayload as any,
      {
        onSuccess: async () => {
          if (user?.id) {
            const action = oldStatus === "Aberto" && newStatus === "Em Andamento"
              ? "picked"
              : "status_change";
            await supabase.from("ticket_history").insert({
              ticket_id: draggableId,
              user_id: user.id,
              action,
              old_value: oldStatus,
              new_value: newStatus,
            });
          }
        },
      }
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {grouped.map((col) => (
          <div key={col.id} className="flex-shrink-0 w-[260px] flex flex-col">
            <div className={`${col.color} text-white rounded-t-lg px-3 py-2 flex items-center justify-between`}>
              <span className="text-xs font-semibold truncate">{col.label}</span>
              <span className="text-xs font-bold bg-white/20 rounded-full px-2 py-0.5">
                {col.tickets.length}
              </span>
            </div>
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 rounded-b-lg border border-t-0 border-border p-2 space-y-2 overflow-y-auto max-h-[60vh] transition-colors ${
                    snapshot.isDraggingOver ? "bg-muted/50" : "bg-background"
                  }`}
                >
                  {col.tickets.map((ticket, index) => (
                    <Draggable key={ticket.id} draggableId={ticket.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => onSelect(ticket)}
                          className={`rounded-lg border border-border p-3 cursor-pointer transition-shadow ${
                            snapshot.isDragging
                              ? "shadow-lg bg-card ring-2 ring-primary/30"
                              : "bg-card hover:shadow-md"
                          }`}
                        >
                          <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                            {ticket.title}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <PriorityBadge priority={ticket.priority} />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-2 truncate">
                            {ticket.creatorProfile?.full_name || "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {col.tickets.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      Nenhum chamado
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
