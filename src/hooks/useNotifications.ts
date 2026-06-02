import { useEffect, useState, useCallback, useMemo } from "react";
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

export interface NotificationGroup {
  key: string;
  ticket_id: string | null;
  latest: AppNotification;
  count: number;
  unreadCount: number;
  typeCounts: Record<string, number>;
  items: AppNotification[];
}

const PAGE_SIZE = 50;

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

  const groups = useMemo<NotificationGroup[]>(() => {
    const map = new Map<string, NotificationGroup>();
    for (const n of items) {
      const key = n.ticket_id ?? `__other__:${n.id}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(n);
        existing.count += 1;
        if (!n.read_at) existing.unreadCount += 1;
        existing.typeCounts[n.type] = (existing.typeCounts[n.type] || 0) + 1;
        if (new Date(n.created_at) > new Date(existing.latest.created_at)) {
          existing.latest = n;
        }
      } else {
        map.set(key, {
          key,
          ticket_id: n.ticket_id,
          latest: n,
          count: 1,
          unreadCount: n.read_at ? 0 : 1,
          typeCounts: { [n.type]: 1 },
          items: [n],
        });
      }
    }
    const list = Array.from(map.values());
    list.forEach((g) =>
      g.items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    );
    list.sort(
      (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
    );
    return list;
  }, [items]);

  const markAsRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)));
    await supabase.from("notifications" as any).update({ read_at: now }).eq("id", id);
  }, []);

  const markGroupAsRead = useCallback(
    async (ticketId: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((n) => (n.ticket_id === ticketId && !n.read_at ? { ...n, read_at: now } : n))
      );
      await supabase
        .from("notifications" as any)
        .update({ read_at: now })
        .eq("user_id", user.id)
        .eq("ticket_id", ticketId)
        .is("read_at", null);
    },
    [user?.id]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications" as any).update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
  }, [user?.id]);

  return { items, groups, loading, unreadCount, markAsRead, markGroupAsRead, markAllAsRead, refresh: fetchAll };
}
