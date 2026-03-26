import { useState } from "react";
import { LayoutList, ChevronDown, ChevronRight, Pencil, Plus, Check, X, Award } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  level: string;
  parent_id: string | null;
  is_active: boolean;
  score: number | null;
}

const levelLabels: Record<string, string> = {
  macro: "Macro",
  sistema: "Sistema",
  item: "Item",
};

const levelColors: Record<string, string> = {
  macro: "bg-muted text-muted-foreground",
  sistema: "bg-primary/10 text-primary",
  item: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function Categorias() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newScore, setNewScore] = useState<number>(0);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editScore, setEditScore] = useState<number>(0);
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const createCategory = useMutation({
    mutationFn: async ({ name, parentId, level, score }: { name: string; parentId: string | null; level: string; score?: number }) => {
      const { error } = await supabase
        .from("categories")
        .insert({ name, parent_id: parentId, level, score: level === "item" ? (score ?? 0) : null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
      setNewScore(0);
      setAddingTo(null);
      toast.success("Categoria criada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Category> }) => {
      const { error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingId(null);
      toast.success("Categoria atualizada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const macros = categories.filter((c) => c.level === "macro" && !c.parent_id);
  const getChildren = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  const handleAdd = (parentId: string | null, level: string) => {
    if (!newName.trim()) return;
    createCategory.mutate({ name: newName.trim(), parentId, level, score: level === "item" ? newScore : undefined });
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditScore(cat.score ?? 0);
  };

  const saveEdit = (cat: Category) => {
    const updates: Partial<Category> = { name: editName };
    if (cat.level === "item") {
      updates.score = editScore;
    }
    updateCategory.mutate({ id: cat.id, updates });
  };

  const renderCategory = (cat: Category, depth: number) => {
    const children = getChildren(cat.id);
    const isExpanded = expanded.has(cat.id);
    const childLevel = cat.level === "macro" ? "sistema" : "item";

    return (
      <div key={cat.id} style={{ marginLeft: depth * 24 }}>
        <div className="flex items-center gap-3 p-3 border border-border rounded-lg mb-2 bg-card hover:shadow-sm transition-shadow">
          {children.length > 0 || isAdmin ? (
            <button onClick={() => toggleExpand(cat.id)} className="text-muted-foreground">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <LayoutList className="h-4 w-4 text-muted-foreground" />

          {editingId === cat.id ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 min-w-[120px] px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                autoFocus
              />
              {cat.level === "item" && (
                <div className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-amber-500" />
                  <input
                    type="number"
                    min={0}
                    value={editScore}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                    placeholder="Pts"
                  />
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
              )}
              <button
                onClick={() => saveEdit(cat)}
                className="p-1 text-primary hover:bg-primary/10 rounded"
              >
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <span className={`text-sm font-medium ${!cat.is_active ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {cat.name}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${levelColors[cat.level]}`}>
                {levelLabels[cat.level]}
              </span>
              {cat.level === "item" && cat.score != null && cat.score > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Award className="h-3 w-3" />
                  {cat.score} pts
                </span>
              )}
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isAdmin && editingId !== cat.id && (
              <button
                onClick={() => startEdit(cat)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() =>
                  updateCategory.mutate({ id: cat.id, updates: { is_active: !cat.is_active } })
                }
                className={`relative w-10 h-5 rounded-full transition-colors ${cat.is_active ? "bg-primary" : "bg-muted"}`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${
                    cat.is_active ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div>
            {children.map((child) => renderCategory(child, depth + 1))}
            {isAdmin && cat.level !== "item" && (
              <>
                {addingTo === cat.id ? (
                  <div className="flex items-center gap-2 mb-2" style={{ marginLeft: 24 }}>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome..."
                      className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleAdd(cat.id, childLevel)}
                    />
                    <button onClick={() => handleAdd(cat.id, childLevel)} className="p-1.5 text-primary hover:bg-primary/10 rounded">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setAddingTo(null); setNewName(""); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(cat.id)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground ml-6 mb-2 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo {levelLabels[childLevel]}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <LayoutList className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Estrutura hierárquica: Macro Categoria → Sistema → Item (com pontuação)
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card-elevated p-5 space-y-1">
          <h2 className="text-base font-semibold text-foreground mb-4">Árvore de Categorias</h2>
          {macros.map((cat) => renderCategory(cat, 0))}

          {isAdmin && (
            <>
              {addingTo === "root" ? (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome..."
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleAdd(null, "macro")}
                  />
                  <button onClick={() => handleAdd(null, "macro")} className="p-1.5 text-primary hover:bg-primary/10 rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setAddingTo(null); setNewName(""); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTo("root")}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-3 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nova Macro Categoria
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
