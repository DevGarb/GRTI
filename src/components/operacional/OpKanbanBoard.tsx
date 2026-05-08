import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { ReactNode } from "react";

export interface KanbanColumn {
  id: string;
  label: string;
  color?: string;
  count?: number;
}

interface Props<T extends { id: string }> {
  columns: KanbanColumn[];
  itemsByColumn: Record<string, T[]>;
  renderCard: (item: T) => ReactNode;
  onMove: (item: T, fromCol: string, toCol: string) => void;
  isAllowed?: (item: T, fromCol: string, toCol: string) => boolean;
  emptyText?: string;
  resolveItem: (id: string) => T | undefined;
}

export default function OpKanbanBoard<T extends { id: string }>({
  columns, itemsByColumn, renderCard, onMove, isAllowed, emptyText = "Vazio", resolveItem,
}: Props<T>) {
  const handleEnd = (r: DropResult) => {
    const { destination, source, draggableId } = r;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    const item = resolveItem(draggableId);
    if (!item) return;
    if (isAllowed && !isAllowed(item, source.droppableId, destination.droppableId)) return;
    onMove(item, source.droppableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {columns.map(col => {
          const list = itemsByColumn[col.id] || [];
          return (
            <div key={col.id} className="flex-shrink-0 w-[280px] flex flex-col">
              <div className={`${col.color || "bg-primary"} text-white rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                <span className="text-xs font-semibold truncate">{col.label}</span>
                <span className="text-xs font-bold bg-white/20 rounded-full px-2 py-0.5">
                  {col.count ?? list.length}
                </span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-b-lg border border-t-0 border-border p-2 space-y-2 overflow-y-auto max-h-[70vh] transition-colors ${
                      snapshot.isDraggingOver ? "bg-muted/50" : "bg-background"
                    }`}
                  >
                    {list.map((item, i) => (
                      <Draggable key={item.id} draggableId={item.id} index={i}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={`rounded-lg border border-border bg-card p-3 cursor-pointer transition-shadow ${
                              snap.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
                            }`}
                          >
                            {renderCard(item)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {list.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground">{emptyText}</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
