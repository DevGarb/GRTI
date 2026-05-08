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

const priorityDot: Record<string, string> = {
  baixa: "bg-muted-foreground/40",
  media: "bg-blue-500",
  alta: "bg-red-500",
  sem: "bg-transparent border border-muted-foreground/40",
};

const quadrantStyles: Record<number, { label: string; cls: string }> = {
  1: { label: "I", cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
  2: { label: "II", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  3: { label: "III", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  4: { label: "IV", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
};

export default function TodoRow({ todo, isOwner, showAuthor, onToggleComplete, onDelete, onOpen }: Props) {
  const completed = todo.status === "concluido";
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  const q = todo.eisenhower_quadrant;

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
        <span className={cn("inline-block h-2 w-2 rounded-full mr-2 align-middle", priorityDot[todo.priority] || priorityDot.sem)} />
        {q && (
          <span className={cn("inline-flex items-center justify-center h-4 min-w-[18px] px-1 rounded text-[10px] font-semibold border mr-2 align-middle", quadrantStyles[q].cls)}>
            {quadrantStyles[q].label}
          </span>
        )}
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
