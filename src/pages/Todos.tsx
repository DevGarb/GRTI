import { useMemo, useState } from "react";
import { Plus, ChevronDown, ChevronRight, User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [expandedUser, setExpandedUser] = useState<string | null>(user?.id ?? null);

  const filtered = useMemo(() => {
    if (!search) return todos;
    const q = search.toLowerCase();
    return todos.filter((t) => `${t.title} ${t.description ?? ""}`.toLowerCase().includes(q));
  }, [todos, search]);

  const groups = useMemo(() => {
    const map = new Map<string, { userId: string; name: string; avatar: string | null; items: TodoWithAuthor[] }>();
    for (const t of filtered) {
      const g = map.get(t.user_id) || { userId: t.user_id, name: t.author_name || "Usuário", avatar: t.author_avatar ?? null, items: [] };
      g.items.push(t);
      map.set(t.user_id, g);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (a.userId === user?.id) return -1;
      if (b.userId === user?.id) return 1;
      return a.name.localeCompare(b.name);
    });
    return arr;
  }, [filtered, user?.id]);

  const handleExport = () => {
    const lines: string[] = ["RESUMO DE TODOs", "================", ""];
    for (const g of groups) {
      const pendentes = g.items.filter((t) => t.status !== "concluido");
      const concluidos = g.items.filter((t) => t.status === "concluido");
      lines.push(g.name.toUpperCase());
      lines.push("-".repeat(g.name.length));
      lines.push(`Pendentes (${pendentes.length}):`);
      pendentes.forEach((t) => lines.push(`  [ ] ${t.title}`));
      lines.push(`Concluídos (${concluidos.length}):`);
      concluidos.forEach((t) => lines.push(`  [x] ${t.title}`));
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `todos-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TODO List</h1>
          <p className="text-muted-foreground">Tarefas pendentes e concluídas, agrupadas por pessoa.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={groups.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar TXT
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo TODO
          </Button>
        </div>
      </div>

      <Input
        placeholder="Buscar..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : groups.length === 0 ? (
        <div className="text-muted-foreground text-center py-12">Nenhum TODO encontrado.</div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isExpanded = expandedUser === g.userId;
            const pendentes = g.items.filter((t) => t.status !== "concluido");
            const concluidos = g.items.filter((t) => t.status === "concluido");
            const isMe = g.userId === user?.id;

            return (
              <div key={g.userId} className="card-elevated overflow-hidden border border-border rounded-lg bg-card">
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : g.userId)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={g.avatar || undefined} />
                    <AvatarFallback>
                      {g.name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-semibold text-foreground">
                      {g.name.toUpperCase()}{isMe && <span className="ml-2 text-xs text-muted-foreground font-normal">(você)</span>}
                    </span>
                    <p className="text-[12px] text-muted-foreground">{g.items.length} TODO{g.items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {pendentes.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        Pendentes: {pendentes.length}
                      </span>
                    )}
                    {concluidos.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Concluídos: {concluidos.length}
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                      Pendentes ({pendentes.length})
                    </div>
                    {pendentes.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">Nada pendente.</div>
                    ) : (
                      pendentes.map((t) => (
                        <TodoRow
                          key={t.id}
                          todo={t}
                          isOwner={t.user_id === user?.id}
                          showAuthor={false}
                          onToggleComplete={(v) => setCompleted(t, v)}
                          onDelete={() => deleteTodo(t.id)}
                          onOpen={() => setSelected(t)}
                        />
                      ))
                    )}

                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30 border-t border-border">
                      Concluídos ({concluidos.length})
                    </div>
                    {concluidos.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">Nenhum concluído.</div>
                    ) : (
                      concluidos.map((t) => (
                        <TodoRow
                          key={t.id}
                          todo={t}
                          isOwner={t.user_id === user?.id}
                          showAuthor={false}
                          onToggleComplete={(v) => setCompleted(t, v)}
                          onDelete={() => deleteTodo(t.id)}
                          onOpen={() => setSelected(t)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <NewTodoModal open={open} onOpenChange={setOpen} onCreate={createTodo} />
      <TodoDetailModal todo={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  );
}
