import TiPageHeader from "@/components/ti/TiPageHeader";
import { useMemo, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Plus, ChevronDown, ChevronRight, User, Download, Search, CalendarClock,
  Grid2x2, History, ListTodo, CircleDashed, CheckCircle2, Users, Inbox,
} from "lucide-react";
import { useTodos } from "@/hooks/useTodos";
import { useAuth } from "@/contexts/AuthContext";
import NewTodoModal from "@/components/todos/NewTodoModal";
import TodoRow from "@/components/todos/TodoRow";
import TodoDetailModal from "@/components/todos/TodoDetailModal";
import type { TodoWithAuthor } from "@/hooks/useTodos";
import { formatDateBR } from "@/lib/dateFormat";

type ViewTab = "hoje" | "matriz" | "historico";

const TABS: { id: ViewTab; label: string; Icon: any }[] = [
  { id: "hoje", label: "Hoje", Icon: CalendarClock },
  { id: "matriz", label: "Matriz", Icon: Grid2x2 },
  { id: "historico", label: "Histórico", Icon: History },
];

const QUADRANTS: { id: 1 | 2 | 3 | 4; title: string; subtitle: string; cls: string; numeralCls: string; numeral: string }[] = [
  { id: 1, title: "Urgente e Importante", subtitle: "Faça agora — Crises", cls: "border-red-500/30 bg-red-500/5", numeralCls: "bg-gradient-to-br from-red-500 to-red-600 text-white", numeral: "I" },
  { id: 2, title: "Não Urgente e Importante", subtitle: "Planeje / Agende — Foco", cls: "border-amber-500/30 bg-amber-500/5", numeralCls: "bg-gradient-to-br from-amber-500 to-amber-600 text-white", numeral: "II" },
  { id: 3, title: "Urgente e Não Importante", subtitle: "Delegue — Interrupções", cls: "border-sky-500/30 bg-sky-500/5", numeralCls: "bg-gradient-to-br from-sky-500 to-sky-600 text-white", numeral: "III" },
  { id: 4, title: "Não Urgente e Não Importante", subtitle: "Elimine — Distrações", cls: "border-emerald-500/30 bg-emerald-500/5", numeralCls: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white", numeral: "IV" },
];

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const rise: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

const isToday = (iso?: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export default function TodosTI() {
  const reduce = useReducedMotion();
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
      return todos.filter((t) => t.user_id === user?.id && t.status !== "concluido");
    }
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

  const pendCount = filtered.filter((t) => t.status !== "concluido").length;
  const doneCount = filtered.filter((t) => t.status === "concluido").length;
  const peopleCount = new Set(filtered.map((t) => t.user_id)).size;
  const stats = [
    { label: "Pendentes", count: pendCount, Icon: CircleDashed, bar: "bg-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
    { label: tab === "hoje" ? "Concluídos hoje" : "Concluídos", count: doneCount, Icon: CheckCircle2, bar: "bg-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
    { label: "Pessoas", count: peopleCount, Icon: Users, bar: "bg-sky-500", bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-600 dark:text-sky-400" },
  ];

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
    <div className="max-w-7xl space-y-6">
      <motion.div variants={stagger} initial={reduce ? false : "hidden"} animate="show" className="space-y-6">
        {/* Header command bar — signature */}
        <motion.div variants={rise} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.07] via-cyan-400/[0.04] to-violet-500/[0.07]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <TiPageHeader
              className="mb-0"
              eyebrow="Gestão de Tarefas · Setor T.I"
              title="TODO List"
              description={
                tab === "hoje"
                  ? "Pendentes e concluídos de hoje, agrupados por pessoa."
                  : tab === "matriz"
                  ? "Suas tarefas na matriz de Eisenhower — priorize por urgência e importância."
                  : "Histórico completo de tarefas concluídas."
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExport}
                disabled={groups.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Exportar TXT
              </button>
              <button
                onClick={() => setOpen(true)}
                className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[hsl(207,95%,42%)] to-[hsl(190,90%,42%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_hsl(199_95%_50%/0.6)] transition-all hover:shadow-[0_16px_48px_-12px_hsl(199_95%_55%/0.8)] active:scale-[0.98]"
              >
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 blur-sm transition-all duration-700 group-hover/btn:left-[120%] group-hover/btn:opacity-100" />
                <Plus className="relative h-4 w-4" />
                <span className="relative">Novo TODO</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(({ label, count, Icon, bar, bg, text }) => (
            <motion.div key={label} variants={rise} className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono-tech text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className={`font-display text-3xl font-bold ${text}`}>{count}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${text}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Tabs + busca */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex items-center rounded-lg border border-border bg-background/60 p-0.5 backdrop-blur">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar tarefa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/60 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 sm:w-64"
              />
            </div>
            {tab === "historico" && (
              <>
                <div>
                  <label className="mb-1 block font-mono-tech text-[11px] uppercase tracking-widest text-muted-foreground">De</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-xl border border-input bg-background/60 px-3 py-2 text-sm text-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono-tech text-[11px] uppercase tracking-widest text-muted-foreground">Até</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-xl border border-input bg-background/60 px-3 py-2 text-sm text-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-12 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : tab === "matriz" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {QUADRANTS.map((q) => {
              const items = filtered.filter((t) => t.eisenhower_quadrant === q.id);
              return (
                <div key={q.id} className={`rounded-2xl border ${q.cls} p-4`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-display text-xs font-bold shadow-sm ${q.numeralCls}`}>
                      {q.numeral}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{q.title}</div>
                      <div className="text-[11px] text-muted-foreground">{q.subtitle}</div>
                    </div>
                  </div>
                  <div className="min-h-[60px] space-y-1 overflow-hidden rounded-xl border border-border bg-card">
                    {items.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">Sem tarefas</div>
                    ) : (
                      items.map((t) => (
                        <TodoRow key={t.id} todo={t} isOwner={t.user_id === user?.id} showAuthor={false} onToggleComplete={(v) => setCompleted(t, v)} onDelete={() => deleteTodo(t.id)} onOpen={() => setSelected(t)} />
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
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-2 text-sm font-semibold">Sem classificação ({semClass.length})</div>
                <div className="overflow-hidden rounded-xl border border-border">
                  {semClass.map((t) => (
                    <TodoRow key={t.id} todo={t} isOwner={t.user_id === user?.id} showAuthor={false} onToggleComplete={(v) => setCompleted(t, v)} onDelete={() => deleteTodo(t.id)} onOpen={() => setSelected(t)} />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-sky-500/15 to-cyan-400/10">
            <Inbox className="h-7 w-7 text-cyan-600 dark:text-cyan-300" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-foreground">Nenhuma tarefa por aqui</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "hoje" ? "Crie um TODO para organizar o dia da equipe." : "Nenhum registro no período selecionado."}
            </p>
          </div>
          {tab === "hoje" && (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(207,95%,42%)] to-[hsl(190,90%,42%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_hsl(199_95%_50%/0.6)] transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Criar primeiro TODO
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isExpanded = expandedUser === g.userId;
            const pendentes = g.items.filter((t) => t.status !== "concluido");
            const concluidos = g.items.filter((t) => t.status === "concluido");
            const isMe = g.userId === user?.id;

            return (
              <div key={g.userId} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <button onClick={() => setExpandedUser(isExpanded ? null : g.userId)} className="flex w-full items-center gap-3 p-4 transition-colors hover:bg-muted/40">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-cyan-400/20 bg-gradient-to-br from-sky-500/20 to-cyan-400/10">
                    {g.avatar ? (
                      <img src={g.avatar} alt={g.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-sm font-bold text-cyan-600 dark:text-cyan-300">
                        {g.name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-display text-sm font-semibold text-foreground">
                      {g.name.toUpperCase()}
                      {isMe && <span className="ml-2 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-400">você</span>}
                    </span>
                    <p className="font-mono-tech text-[11px] text-muted-foreground">{g.items.length} TODO{g.items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {tab === "hoje" && pendentes.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Pendentes: {pendentes.length}
                      </span>
                    )}
                    {concluidos.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {tab === "hoje" ? "Concluídos hoje" : "Concluídos"}: {concluidos.length}
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border">
                    {tab === "hoje" && (
                      <>
                        <div className="bg-muted/30 px-4 py-2 font-mono-tech text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Pendentes ({pendentes.length})
                        </div>
                        {pendentes.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">Nada pendente.</div>
                        ) : (
                          pendentes.map((t) => (
                            <TodoRow key={t.id} todo={t} isOwner={t.user_id === user?.id} showAuthor={false} onToggleComplete={(v) => setCompleted(t, v)} onDelete={() => deleteTodo(t.id)} onOpen={() => setSelected(t)} />
                          ))
                        )}
                      </>
                    )}

                    <div className={`bg-muted/30 px-4 py-2 font-mono-tech text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ${tab === "hoje" ? "border-t border-border" : ""}`}>
                      {tab === "hoje" ? `Concluídos hoje (${concluidos.length})` : `Concluídos (${concluidos.length})`}
                    </div>
                    {concluidos.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">Nenhum concluído.</div>
                    ) : (
                      concluidos.map((t) => (
                        <TodoRow key={t.id} todo={t} isOwner={t.user_id === user?.id} showAuthor={false} onToggleComplete={(v) => setCompleted(t, v)} onDelete={() => deleteTodo(t.id)} onOpen={() => setSelected(t)} />
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
