import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Trash2, Calendar, Play, RotateCcw, MessageSquare } from "lucide-react";
import type { TodoWithAuthor } from "@/hooks/useTodos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  todo: TodoWithAuthor;
  isOwner: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onOpen: () => void;
}

const priorityVariant = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  alta: "bg-red-500/10 text-red-700 dark:text-red-400",
} as const;

const statusLabel = {
  pendente: "Pendente",
  andamento: "Em andamento",
  concluido: "Concluído",
} as const;

const statusVariant = {
  pendente: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  andamento: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  concluido: "bg-green-500/10 text-green-700 dark:text-green-400",
} as const;

export default function TodoCard({ todo, isOwner, onToggle, onDelete }: Props) {
  const ToggleIcon = todo.status === "pendente" ? Play : todo.status === "andamento" ? Check : RotateCcw;
  const toggleLabel =
    todo.status === "pendente" ? "Iniciar" : todo.status === "andamento" ? "Concluir" : "Reabrir";

  return (
    <Card className={`p-4 space-y-3 ${todo.status === "concluido" ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold leading-snug ${todo.status === "concluido" ? "line-through" : ""}`}>
            {todo.title}
          </h4>
          {todo.description && (
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{todo.description}</p>
          )}
        </div>
        <Badge variant="outline" className={priorityVariant[todo.priority]}>
          {todo.priority}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className={statusVariant[todo.status]}>
          {statusLabel[todo.status]}
        </Badge>
        {todo.due_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(todo.due_date), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Avatar className="h-5 w-5">
            <AvatarImage src={todo.author_avatar || undefined} />
            <AvatarFallback className="text-[10px]">
              {todo.author_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <span>{todo.author_name}</span>
        </div>
      </div>

      {isOwner && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onToggle} className="flex-1">
            <ToggleIcon className="h-3.5 w-3.5 mr-1" /> {toggleLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </Card>
  );
}
