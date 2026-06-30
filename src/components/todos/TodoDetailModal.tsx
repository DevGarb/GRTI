import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { Todo, TodoWithAuthor } from "@/hooks/useTodos";
import { QUADRANT_LABEL } from "./NewTodoModal";
import { formatDateTimeBR } from "@/lib/dateFormat";

interface Props {
  todo: TodoWithAuthor | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (id: string, patch: Partial<Todo>) => void | Promise<void>;
}

interface Comment {
  id: string;
  todo_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
}

interface HistoryEntry {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user_id: string | null;
  author_name?: string;
}

const fieldLabel: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  status: "Status",
  priority: "Prioridade",
  due_date: "Prazo",
};

export default function TodoDetailModal({ todo, open, onOpenChange, onUpdate }: Props) {
  const { user } = useAuth();
  const updateTodo = onUpdate;
  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!todo) return;
    const [{ data: cdata }, { data: hdata }] = await Promise.all([
      supabase.from("user_todo_comments").select("*").eq("todo_id", todo.id).order("created_at", { ascending: true }),
      supabase.from("user_todo_history").select("*").eq("todo_id", todo.id).order("created_at", { ascending: false }),
    ]);
    const userIds = Array.from(
      new Set([...(cdata || []).map((c: any) => c.user_id), ...(hdata || []).map((h: any) => h.user_id).filter(Boolean)]),
    );
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setComments(
      (cdata || []).map((c: any) => ({
        ...c,
        author_name: pmap.get(c.user_id)?.full_name || "Usuário",
        author_avatar: pmap.get(c.user_id)?.avatar_url || null,
      })),
    );
    setHistory(
      (hdata || []).map((h: any) => ({
        ...h,
        author_name: h.user_id ? pmap.get(h.user_id)?.full_name || "Usuário" : "Sistema",
      })),
    );
  };

  useEffect(() => {
    if (open && todo) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, todo?.id]);

  const send = async () => {
    if (!todo || !text.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("user_todo_comments").insert({
      todo_id: todo.id,
      user_id: user.id,
      content: text.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Erro ao comentar");
      return;
    }
    setText("");
    load();
  };

  const removeComment = async (id: string) => {
    const { error } = await supabase.from("user_todo_comments").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    load();
  };

  if (!todo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-8">{todo.title}</DialogTitle>
        </DialogHeader>
        {todo.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{todo.description}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Prioridade</label>
            <Select
              value={todo.priority}
              onValueChange={(v) => updateTodo(todo.id, { priority: v as any })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta prioridade</SelectItem>
                <SelectItem value="media">Média prioridade</SelectItem>
                <SelectItem value="baixa">Baixa prioridade</SelectItem>
                <SelectItem value="sem">Sem prioridade</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Matriz de Eisenhower</label>
            <Select
              value={todo.eisenhower_quadrant ? String(todo.eisenhower_quadrant) : "none"}
              onValueChange={(v) =>
                updateTodo(todo.id, { eisenhower_quadrant: v === "none" ? null : (Number(v) as any) } as any)
              }
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem classificação</SelectItem>
                <SelectItem value="1">{QUADRANT_LABEL[1]}</SelectItem>
                <SelectItem value="2">{QUADRANT_LABEL[2]}</SelectItem>
                <SelectItem value="3">{QUADRANT_LABEL[3]}</SelectItem>
                <SelectItem value="4">{QUADRANT_LABEL[4]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Tabs defaultValue="comments" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="comments">Comentários ({comments.length})</TabsTrigger>
            <TabsTrigger value="history">Histórico ({history.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="comments" className="flex-1 overflow-y-auto space-y-3 mt-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum comentário ainda.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.author_avatar || undefined} />
                    <AvatarFallback>{c.author_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{c.author_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimeBR(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap mt-1">{c.content}</p>
                  </div>
                  {c.user_id === user?.id && (
                    <Button size="icon" variant="ghost" onClick={() => removeComment(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </TabsContent>
          <TabsContent value="history" className="flex-1 overflow-y-auto space-y-2 mt-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem alterações registradas.</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="text-sm border-l-2 border-primary/30 pl-3 py-1">
                  <div className="text-xs text-muted-foreground">
                    {formatDateTimeBR(h.created_at)} · {h.author_name}
                  </div>
                  <div>
                    <span className="font-medium">{fieldLabel[h.field] || h.field}</span>:{" "}
                    <span className="text-muted-foreground line-through">{h.old_value || "—"}</span>{" → "}
                    <span>{h.new_value || "—"}</span>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
        <div className="border-t pt-3 flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário..."
            rows={2}
            className="flex-1"
          />
          <Button onClick={send} disabled={sending || !text.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
