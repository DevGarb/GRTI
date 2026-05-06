import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTodos } from "@/hooks/useTodos";
import { useAuth } from "@/contexts/AuthContext";
import NewTodoModal from "@/components/todos/NewTodoModal";
import TodoCard from "@/components/todos/TodoCard";
import TodoDetailModal from "@/components/todos/TodoDetailModal";
import type { TodoWithAuthor } from "@/hooks/useTodos";

export default function Todos() {
  const { user } = useAuth();
  const { todos, loading, createTodo, toggleStatus, deleteTodo } = useTodos();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TodoWithAuthor | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");

  const authors = useMemo(() => {
    const map = new Map<string, string>();
    todos.forEach((t) => map.set(t.user_id, t.author_name || "Usuário"));
    return Array.from(map.entries());
  }, [todos]);

  const filtered = useMemo(() => {
    return todos.filter((t) => {
      if (search && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (authorFilter !== "all" && t.user_id !== authorFilter) return false;
      return true;
    });
  }, [todos, search, statusFilter, authorFilter]);

  const grouped = useMemo(() => {
    const g = new Map<string, typeof filtered>();
    filtered.forEach((t) => {
      const arr = g.get(t.user_id) || [];
      arr.push(t);
      g.set(t.user_id, arr);
    });
    return Array.from(g.entries());
  }, [filtered]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TODO List</h1>
          <p className="text-muted-foreground">Gerencie suas tarefas pessoais e veja as da equipe.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo TODO
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="andamento">Em andamento</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
        {authors.length > 1 && (
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {authors.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : grouped.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">Nenhum TODO encontrado.</div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([uid, items]) => {
            const name = items[0]?.author_name || "Usuário";
            const pending = items.filter((i) => i.status !== "concluido").length;
            return (
              <section key={uid} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{name}</h2>
                  <span className="text-xs text-muted-foreground">
                    {pending} pendente{pending !== 1 ? "s" : ""} · {items.length} total
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((t) => (
                    <TodoCard
                      key={t.id}
                      todo={t}
                      isOwner={t.user_id === user?.id}
                      onToggle={() => toggleStatus(t)}
                      onDelete={() => deleteTodo(t.id)}
                      onOpen={() => setSelected(t)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <NewTodoModal open={open} onOpenChange={setOpen} onCreate={createTodo} />
    </div>
  );
}
