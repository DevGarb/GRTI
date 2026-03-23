import { useState } from "react";
import { MessageSquare, Send, Paperclip, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  ticketId: string;
}

export default function TicketComments({ ticketId }: Props) {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const { data: comments = [] } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      return data.map((c) => ({
        ...c,
        user_name: profileMap.get(c.user_id) || "Usuário",
      }));
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ticket_comments").insert({
        ticket_id: ticketId,
        user_id: user!.id,
        content,
        is_public: isPublic,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
      setContent("");
      toast.success("Comentário adicionado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const fileName = `comment-${Date.now()}.png`;
        const { data, error } = await supabase.storage
          .from("attachments")
          .upload(`comments/${ticketId}/${fileName}`, file);
        if (error) {
          toast.error("Erro ao enviar imagem");
          return;
        }
        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(data.path);
        setContent((prev) => prev + `\n![imagem](${urlData.publicUrl})`);
        toast.success("Imagem colada!");
      }
    }
  };

  const canSeePrivate = hasRole("admin") || hasRole("tecnico");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <MessageSquare className="h-3.5 w-3.5" />
        Comentários
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`p-3 rounded-lg text-sm ${
                !c.is_public
                  ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                  : "bg-muted/30 border border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground">{c.user_name}</span>
                <div className="flex items-center gap-2">
                  {!c.is_public && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <EyeOff className="h-3 w-3" /> Interno
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")},{" "}
                    {new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          placeholder="Escreva um comentário ou cole uma imagem (Ctrl+V)..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canSeePrivate && (
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-input"
              >
                {isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {isPublic ? "Público" : "Interno"}
              </button>
            )}
            <button type="button" className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          <button
            disabled={!content.trim() || addComment.isPending}
            onClick={() => addComment.mutate()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
