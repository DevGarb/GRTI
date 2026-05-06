import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTodos } from "@/hooks/useTodos";
import { useAuth } from "@/contexts/AuthContext";
import NewTodoModal from "@/components/todos/NewTodoModal";
import TodoRow from "@/components/todos/TodoRow";
import TodoDetailModal from "@/components/todos/TodoDetailModal";
import type { TodoWithAuthor } from "@/hooks/useTodos";

export default function Todos() {
  const { user } = useAuth();
  const { todos, loading, createTodo, setCompleted, deleteTodo } = useTodos();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TodoWithAuthor | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return todos;
    const q = search.toLowerCase();
    return todos.filter((t) => `${t.title} ${t.description ?? ""}`.toLowerCase().includes(q));
  }, [todos, search]);

  const pendentes = filtered.filter((t) => t.status !== "concluido");
  const concluidos = filtered.filter((t) => t.status === "concluido");

  const hasMultipleAuthors = useMemo(
    () => new Set(todos.map((t) => t.user_id)).size > 1,
    [todos],
  );

  const renderColumn = (title: string, items: TodoWithAuthor[], emptyText: string) => (
    <section className="border border-border rounded-lg bg-card">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </header>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div>
          {items.map((t) => (
            <TodoRow
              key={t.id}
              todo={t}
              isOwner={t.user_id === user?.id}
              showAuthor={hasMultipleAuthors}
              onToggleComplete={(v) => setCompleted(t, v)}
              onDelete={() => deleteTodo(t.id)}
              onOpen={() => setSelected(t)}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TODO List</h1>
          <p className="text-muted-foreground">Tarefas pendentes e concluídas.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo TODO
        </Button>
      </div>

      <Input
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderColumn("Pendentes", pendentes, "Nada pendente.")}
          {renderColumn("Concluídos", concluidos, "Nenhum concluído ainda.")}
        </div>
      )}

      <NewTodoModal open={open} onOpenChange={setOpen} onCreate={createTodo} />
      <TodoDetailModal todo={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}
