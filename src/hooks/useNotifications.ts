import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: string;
  title: string;
  body: string | null;
  ticket_id: string | null;
  read_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 30;

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    setItems((data as any) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as AppNotification, ...prev].slice(0, PAGE_SIZE));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setItems((prev) => prev.map((n) => (n.id === (payload.new as any).id ? (payload.new as AppNotification) : n)));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markAsRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from("notifications" as any).update({ read_at: new Date().toISOString() }).eq("id", id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications" as any).update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
  }, [user?.id]);

  return { items, loading, unreadCount, markAsRead, markAllAsRead, refresh: fetchAll };
}
