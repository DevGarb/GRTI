import { useMemo, useState } from "react";
import { Plus, ChevronDown, ChevronRight, User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTodos } from "@/hooks/useTodos";
import { useAuth } from "@/contexts/AuthContext";
import NewTodoModal from "@/components/todos/NewTodoModal";
import TodoRow from "@/components/todos/TodoRow";
import TodoDetailModal from "@/components/todos/TodoDetailModal";
import type { TodoWithAuthor } from "@/hooks/useTodos";
import { formatDateBR } from "@/lib/dateFormat";
import TodosTI from "@/pages/TodosTI";

const TI_ORG_ID = "a543a17b-0def-4ceb-acf5-91017f2b0ad3";

type ViewTab = "hoje" | "matriz" | "historico";

const QUADRANTS: { id: 1 | 2 | 3 | 4; title: string; subtitle: string; cls: string; numeralCls: string }[] = [
  { id: 1, title: "Urgente e Importante", subtitle: "Faça agora — Crises", cls: "border-red-500/30 bg-red-500/5", numeralCls: "bg-red-500 text-white" },
  { id: 2, title: "Não Urgente e Importante", subtitle: "Planeje / Agende — Foco", cls: "border-amber-500/30 bg-amber-500/5", numeralCls: "bg-amber-500 text-white" },
  { id: 3, title: "Urgente e Não Importante", subtitle: "Delegue — Interrupções", cls: "border-blue-500/30 bg-blue-500/5", numeralCls: "bg-blue-500 text-white" },
  { id: 4, title: "Não Urgente e Não Importante", subtitle: "Elimine — Distrações", cls: "border-emerald-500/30 bg-emerald-500/5", numeralCls: "bg-emerald-500 text-white" },
];

const isToday = (iso?: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export default function Todos() {
  const { profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (profile?.organization_id === TI_ORG_ID) return <TodosTI />;
  return <TodosLegacy />;
}

function TodosLegacy() {
  const { user } = useAuth();
  const { todos, loading, createTodo, updateTodo, setCompleted, deleteTodo } = useTodos();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TodoWithAuthor | null>(null);
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(user?.id ?? null);
  const [tab, setTab] = useState<ViewTab>("hoje");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const tabFiltered = useMemo(() => {
    if (tab === "hoje") {
      return todos.filter((t) => t.status !== "concluido" || isToday(t.completed_at));
    }
    if (tab === "matriz") {
      // Apenas TODOs do usuário logado, não concluídos
      return todos.filter((t) => t.user_id === user?.id && t.status !== "concluido");
    }
    // histórico: apenas concluídos, com filtro opcional de período
    return todos.filter((t) => {
      if (t.status !== "concluido") return false;
      if (!t.completed_at) return false;
      const d = new Date(t.completed_at);
      if (dateFrom) {
        const from = new Date(dateFrom + "T00:00:00");
        if (d < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo + "T23:59:59");
        if (d > to) return false;
      }
      return true;
    });
  }, [todos, tab, dateFrom, dateTo, user?.id]);

  const filtered = useMemo(() => {
    if (!search) return tabFiltered;
    const q = search.toLowerCase();
    return tabFiltered.filter((t) => `${t.title} ${t.description ?? ""}`.toLowerCase().includes(q));
  }, [tabFiltered, search]);

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
    const titulo = tab === "hoje" ? "RESUMO DE TODOs (HOJE)" : "RESUMO DE TODOs (HISTÓRICO)";
    const lines: string[] = [titulo, "=".repeat(titulo.length), ""];
    for (const g of groups) {
      const pendentes = g.items.filter((t) => t.status !== "concluido");
      const concluidos = g.items.filter((t) => t.status === "concluido");
      lines.push(g.name.toUpperCase());
      lines.push("-".repeat(g.name.length));
      if (tab === "hoje") {
        lines.push(`Pendentes (${pendentes.length}):`);
        pendentes.forEach((t) => lines.push(`  [ ] ${t.title}`));
        lines.push(`Concluídos hoje (${concluidos.length}):`);
        concluidos.forEach((t) => lines.push(`  [x] ${t.title}`));
      } else {
        lines.push(`Concluídos (${concluidos.length}):`);
        concluidos.forEach((t) => {
          const d = t.completed_at ? formatDateBR(t.completed_at) : "";
          lines.push(`  [x] ${t.title}${d ? ` — ${d}` : ""}`);
        });
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `todos-${tab}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TODO List</h1>
          <p className="text-muted-foreground">
            {tab === "hoje"
              ? "Pendentes e concluídos de hoje, agrupados por pessoa."
              : "Histórico completo de TODOs concluídos."}
          </p>
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as ViewTab)}>
        <TabsList>
          <TabsTrigger value="hoje">Hoje</TabsTrigger>
          <TabsTrigger value="matriz">Matriz</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-3 items-end">
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {tab === "historico" && (
          <>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">De</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Até</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); }}>Limpar</Button>
            )}
          </>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : tab === "matriz" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUADRANTS.map((q) => {
              const items = filtered.filter((t) => t.eisenhower_quadrant === q.id);
              return (
                <div key={q.id} className={`rounded-xl border ${q.cls} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${q.numeralCls}`}>
                      {q.id === 1 ? "I" : q.id === 2 ? "II" : q.id === 3 ? "III" : "IV"}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{q.title}</div>
                      <div className="text-[11px] text-muted-foreground">{q.subtitle}</div>
                    </div>
                  </div>
                  <div className="space-y-1 bg-card rounded-lg border border-border overflow-hidden min-h-[60px]">
                    {items.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-muted-foreground text-center">Sem tarefas</div>
                    ) : (
                      items.map((t) => (
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
                </div>
              );
            })}
          </div>
          {(() => {
            const semClass = filtered.filter((t) => !t.eisenhower_quadrant);
            if (semClass.length === 0) return null;
            return (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm font-semibold mb-2">Sem classificação ({semClass.length})</div>
                <div className="border border-border rounded-lg overflow-hidden">
                  {semClass.map((t) => (
                    <TodoRow
                      key={t.id}
                      todo={t}
                      isOwner={t.user_id === user?.id}
                      showAuthor={false}
                      onToggleComplete={(v) => setCompleted(t, v)}
                      onDelete={() => deleteTodo(t.id)}
                      onOpen={() => setSelected(t)}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
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
                    {tab === "hoje" && pendentes.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        Pendentes: {pendentes.length}
                      </span>
                    )}
                    {concluidos.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        {tab === "hoje" ? "Concluídos hoje" : "Concluídos"}: {concluidos.length}
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {tab === "hoje" && (
                      <>
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
                      </>
                    )}

                    <div className={`px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30 ${tab === "hoje" ? "border-t border-border" : ""}`}>
                      {tab === "hoje" ? `Concluídos hoje (${concluidos.length})` : `Concluídos (${concluidos.length})`}
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
      <TodoDetailModal todo={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} onUpdate={updateTodo} />
    </div>
  );
}
