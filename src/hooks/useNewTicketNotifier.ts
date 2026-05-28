import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FLASH_TITLE = "🔔 Novo chamado!";
const STOP_ROUTES = ["/chamados-abertos"];

function playBeep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // silently ignore — user hasn't interacted yet, etc.
  }
}

export function useNewTicketNotifier() {
  const { user, profile, hasRole, isSuperAdmin } = useAuth();
  const location = useLocation();
  const intervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>(typeof document !== "undefined" ? document.title : "");
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const stopFlashing = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      document.title = originalTitleRef.current || "GRTI";
    }
  };

  const startFlashing = () => {
    if (intervalRef.current !== null) return;
    originalTitleRef.current = document.title.replace(FLASH_TITLE, "").trim() || "GRTI";
    let toggle = false;
    intervalRef.current = window.setInterval(() => {
      toggle = !toggle;
      document.title = toggle ? FLASH_TITLE : originalTitleRef.current;
    }, 1000);
  };

  // Stop flashing when tab gains focus or user enters Chamados em Aberto
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") stopFlashing();
    };
    window.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (STOP_ROUTES.includes(location.pathname)) stopFlashing();
  }, [location.pathname]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !profile?.organization_id) return;
    const isStaff = isSuperAdmin || hasRole("admin") || hasRole("tecnico") || hasRole("desenvolvedor");
    if (!isStaff) return;

    const orgId = profile.organization_id;
    const channel = supabase
      .channel(`new-tickets-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const t = payload.new as { created_by?: string; title?: string; status?: string };
          if (!t) return;
          if (t.created_by === user.id) return;

          playBeep();
          toast("🔔 Novo chamado aberto", {
            description: t.title || "Sem título",
            duration: 6000,
          });

          if (!STOP_ROUTES.includes(locationRef.current) || document.visibilityState !== "visible") {
            startFlashing();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopFlashing();
    };
  }, [user?.id, profile?.organization_id, isSuperAdmin]);
}
