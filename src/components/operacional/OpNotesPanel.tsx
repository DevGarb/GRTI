import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, AtSign } from "lucide-react";
import { useCardNotes, type CardNoteModule } from "@/hooks/useCardNotes";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  module: CardNoteModule;
  cardId: string | null;
}

export default function OpNotesPanel({ module, cardId }: Props) {
  const { user } = useAuth();
  const { notes, users, add, remove } = useCardNotes(module, cardId);
  const [body, setBody] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const filteredUsers = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    return users.filter(u => u.full_name?.toLowerCase().includes(q)).slice(0, 6);
  }, [users, mentionQuery]);

  const handleChange = (val: string) => {
    setBody(val);
    const caret = taRef.current?.selectionStart ?? val.length;
    const before = val.slice(0, caret);
    const m = before.match(/@([^\s@]*)$/);
    if (m) {
      setShowMentions(true);
      setMentionQuery(m[1]);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (u: { user_id: string; full_name: string }) => {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart;
    const before = body.slice(0, caret).replace(/@([^\s@]*)$/, `@${u.full_name.replace(/\s+/g, "_")} `);
    const after = body.slice(caret);
    setBody(before + after);
    setShowMentions(false);
    setTimeout(() => ta.focus(), 0);
  };

  const submit = async () => {
    if (!body.trim()) return;
    // Resolve mentions: find @Name_With_Underscores tokens
    const mentioned: string[] = [];
    const tokens = body.match(/@([A-Za-zÀ-ÿ_]+)/g) || [];
    for (const t of tokens) {
      const name = t.slice(1).replace(/_/g, " ").toLowerCase();
      const u = users.find(u => u.full_name?.toLowerCase() === name);
      if (u) mentioned.push(u.user_id);
    }
    await add(body, Array.from(new Set(mentioned)));
    setBody("");
  };

  if (!cardId) return null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          ref={taRef}
          rows={2}
          value={body}
          onChange={e => handleChange(e.target.value)}
          placeholder="Adicione uma observação. Use @ para mencionar alguém."
        />
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-52 overflow-auto">
            {filteredUsers.map(u => (
              <button
                key={u.user_id}
                type="button"
                onClick={() => insertMention(u)}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-muted text-left text-sm"
              >
                <AtSign className="h-3 w-3 text-muted-foreground" />
                {u.full_name}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-2">
          <Button size="sm" onClick={submit} disabled={!body.trim()}>Adicionar</Button>
        </div>
      </div>

      <div className="space-y-2">
        {notes.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">Nenhuma observação.</div>
        )}
        {notes.map(n => (
          <div key={n.id} className="border rounded-md p-2 bg-muted/30 group">
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={n.author_avatar || undefined} />
                <AvatarFallback className="text-[10px]">{n.author_name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{n.author_name || "—"}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {format(new Date(n.created_at), "dd/MM HH:mm", { locale: ptBR })}
              </span>
              {n.author_id === user?.id && (
                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove(n.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="text-sm whitespace-pre-wrap">
              {n.body.split(/(@[A-Za-zÀ-ÿ_]+)/g).map((part, i) =>
                part.startsWith("@")
                  ? <span key={i} className="text-primary font-medium">{part.replace(/_/g, " ")}</span>
                  : <span key={i}>{part}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
