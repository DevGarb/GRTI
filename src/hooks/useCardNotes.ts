import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type CardNoteModule = "delivery" | "service_order" | "maintenance";

export interface CardNote {
  id: string;
  organization_id: string;
  module: CardNoteModule;
  card_id: string;
  author_id: string;
  body: string;
  mentioned_users: string[];
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
}

export interface MentionableUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export function useCardNotes(module: CardNoteModule, cardId: string | null) {
  const { profile, user } = useAuth();
  const [notes, setNotes] = useState<CardNote[]>([]);
  const [users, setUsers] = useState<MentionableUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!cardId) { setNotes([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("op_card_notes")
      .select("*")
      .eq("module", module)
      .eq("card_id", cardId)
      .order("created_at", { ascending: false });
    const rows = (data || []) as any[];
    if (rows.length) {
      const ids = Array.from(new Set(rows.map(r => r.author_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ids);
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      setNotes(rows.map(r => ({
        ...r,
        author_name: profMap.get(r.author_id)?.full_name || null,
        author_avatar: profMap.get(r.author_id)?.avatar_url || null,
      })));
    } else {
      setNotes([]);
    }
    setLoading(false);
  }, [module, cardId]);

  const fetchUsers = useCallback(async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .eq("organization_id", profile.organization_id)
      .order("full_name");
    setUsers((data || []) as MentionableUser[]);
  }, [profile?.organization_id]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const add = async (body: string, mentioned: string[]) => {
    if (!cardId || !user || !profile?.organization_id || !body.trim()) return;
    const { error } = await supabase.from("op_card_notes").insert({
      module,
      card_id: cardId,
      author_id: user.id,
      organization_id: profile.organization_id,
      body: body.trim(),
      mentioned_users: mentioned,
    });
    if (error) { toast.error(error.message); return; }
    fetchNotes();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("op_card_notes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else fetchNotes();
  };

  return { notes, users, loading, add, remove, refetch: fetchNotes };
}
