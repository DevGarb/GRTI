import { useState, useRef } from "react";
import { MessageSquare, Send, Paperclip, Eye, EyeOff, Trash2, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  ticketId: string;
}

interface PendingFile {
  file: File;
  preview: string;
}

export default function TicketComments({ ticketId }: Props) {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const addFiles = (files: FileList | File[]) => {
    const newFiles: PendingFile[] = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!content.trim() && pendingFiles.length === 0) return;
    setIsUploading(true);

    try {
      let finalContent = content;

      // Upload files and append URLs to content
      for (const pf of pendingFiles) {
        const ext = pf.file.name.split(".").pop() || "bin";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `comments/${ticketId}/${fileName}`;

        const { data, error } = await supabase.storage
          .from("attachments")
          .upload(path, pf.file);

        if (error) {
          console.error("Upload error:", error);
          toast.error(`Erro ao enviar ${pf.file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(data.path);

        if (pf.file.type.startsWith("image/")) {
          finalContent += `\n![${pf.file.name}](${urlData.publicUrl})`;
        } else {
          finalContent += `\n[${pf.file.name}](${urlData.publicUrl})`;
        }
      }

      if (!finalContent.trim()) {
        setIsUploading(false);
        return;
      }

      const { error } = await supabase.from("ticket_comments").insert({
        ticket_id: ticketId,
        user_id: user!.id,
        content: finalContent.trim(),
        is_public: isPublic,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
      setContent("");
      setPendingFiles([]);
      toast.success("Comentário adicionado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar comentário");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) addFiles([file]);
      }
    }
  };

  const canSeePrivate = hasRole("admin") || hasRole("tecnico");

  // Render markdown images inline
  const renderContent = (text: string) => {
    const parts = text.split(/(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        return (
          <a key={i} href={imgMatch[2]} target="_blank" rel="noopener noreferrer">
            <img src={imgMatch[2]} alt={imgMatch[1]} className="max-w-xs max-h-40 rounded mt-1 cursor-pointer hover:opacity-80" />
          </a>
        );
      }
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        return (
          <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
            📎 {linkMatch[1]}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

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
              <div className="text-foreground whitespace-pre-wrap">{renderContent(c.content)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          placeholder="Escreva um comentário ou cole uma imagem (Ctrl+V)..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
        />

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="space-y-1.5">
            {pendingFiles.map((pf, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                {pf.preview ? (
                  <img src={pf.preview} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                    <Image className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                <span className="text-xs text-foreground flex-1 truncate">{pf.file.name}</span>
                <button type="button" onClick={() => removeFile(i)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Anexar arquivo"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>
          <button
            disabled={(!content.trim() && pendingFiles.length === 0) || isUploading}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {isUploading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
