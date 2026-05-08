import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Todo {
  id: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  description: string | null;
  priority: "baixa" | "media" | "alta" | "sem";
  status: "pendente" | "andamento" | "concluido";
  due_date: string | null;
  completed_at: string | null;
  eisenhower_quadrant: 1 | 2 | 3 | 4 | null;
  created_at: string;
  updated_at: string;
}

export interface TodoWithAuthor extends Todo {
  author_name?: string;
  author_avatar?: string | null;
}

export function useTodos() {
  const { user, profile } = useAuth();
  const [todos, setTodos] = useState<TodoWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("user_todos")
      .select("*")
      .order("created_at", { ascending: false });
    if (profile?.organization_id) {
      query = query.eq("organization_id", profile.organization_id);
    }
    const { data, error } = await query;
    if (error) {
      toast.error("Erro ao carregar TODOs");
      setLoading(false);
      return;
    }
    const userIds = Array.from(new Set((data || []).map((t: any) => t.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setTodos(
      (data || []).map((t: any) => ({
        ...t,
        author_name: pmap.get(t.user_id)?.full_name || "Usuário",
        author_avatar: pmap.get(t.user_id)?.avatar_url || null,
      })),
    );
    setLoading(false);
  }, [user?.id, profile?.organization_id]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const createTodo = async (input: {
    title: string;
    description?: string;
    priority?: Todo["priority"];
    due_date?: string | null;
    eisenhower_quadrant?: Todo["eisenhower_quadrant"];
  }) => {
    if (!user) return;
    const { error } = await supabase.from("user_todos").insert({
      user_id: user.id,
      organization_id: profile?.organization_id ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "media",
      due_date: input.due_date ?? null,
      eisenhower_quadrant: input.eisenhower_quadrant ?? null,
    } as any);
    if (error) {
      toast.error("Erro ao criar TODO");
      return;
    }
    toast.success("TODO criado");
    fetchTodos();
  };

  const updateTodo = async (id: string, patch: Partial<Todo>) => {
    const { error } = await supabase.from("user_todos").update(patch).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    fetchTodos();
  };

  const toggleStatus = async (todo: Todo) => {
    const next: Todo["status"] =
      todo.status === "pendente" ? "andamento" : todo.status === "andamento" ? "concluido" : "pendente";
    await updateTodo(todo.id, {
      status: next,
      completed_at: next === "concluido" ? new Date().toISOString() : null,
    });
  };

  const setCompleted = async (todo: Todo, completed: boolean) => {
    await updateTodo(todo.id, {
      status: completed ? "concluido" : "pendente",
      completed_at: completed ? new Date().toISOString() : null,
    });
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase.from("user_todos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("TODO excluído");
    fetchTodos();
  };

  return { todos, loading, createTodo, updateTodo, toggleStatus, setCompleted, deleteTodo, refetch: fetchTodos };
}
