import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Calendar } from "lucide-react";
import type { TodoWithAuthor } from "@/hooks/useTodos";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  todo: TodoWithAuthor;
  isOwner: boolean;
  showAuthor: boolean;
  onToggleComplete: (checked: boolean) => void;
  onDelete: () => void;
  onOpen: () => void;
}

const priorityDot = {
  baixa: "bg-muted-foreground/40",
  media: "bg-blue-500",
  alta: "bg-red-500",
} as const;

export default function TodoRow({ todo, isOwner, showAuthor, onToggleComplete, onDelete, onOpen }: Props) {
  const completed = todo.status === "concluido";
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/40 cursor-pointer transition-colors"
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={completed} onCheckedChange={(v) => onToggleComplete(!!v)} />
      </div>

      <span
        className={cn(
          "flex-1 text-sm truncate",
          completed && "line-through text-muted-foreground",
        )}
      >
        <span className={cn("inline-block h-2 w-2 rounded-full mr-2 align-middle", priorityDot[todo.priority])} />
        {todo.title}
      </span>

      {todo.due_date && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Calendar className="h-3 w-3" />
          {format(new Date(todo.due_date), "dd/MM", { locale: ptBR })}
        </span>
      )}

      {showAuthor && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Avatar className="h-5 w-5">
            <AvatarImage src={todo.author_avatar || undefined} />
            <AvatarFallback className="text-[10px]">
              {todo.author_name?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[100px]">
            {todo.author_name}
          </span>
        </div>
      )}

      {isOwner && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={stop(onDelete)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
