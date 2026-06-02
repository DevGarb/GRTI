import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import alertSound from "@/assets/new-ticket-alert.mp3";

const FLASH_TITLE = "🔔 Novo chamado!";
const STOP_ROUTES = ["/chamados-abertos"];

function playAlert() {
  try {
    const audio = new Audio(alertSound);
    audio.volume = 0.6;
    audio.play().catch((err) => {
      console.warn("[notifier] autoplay bloqueado:", err?.message || err);
    });
  } catch (e) {
    console.warn("[notifier] falha ao tocar alerta:", e);
  }
}

export function useNewTicketNotifier() {
  const { user, profile, roles, isSuperAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const intervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>(typeof document !== "undefined" ? document.title : "");
  const locationRef = useRef(location.pathname);
  const canUseAdminAlert =
    !loading &&
    (isSuperAdmin ||
      roles.includes("admin") ||
      roles.includes("tecnico") ||
      roles.includes("desenvolvedor"));

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const stopFlashing = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      document.title = originalTitleRef.current || "GRTI";
    }
  }, []);

  const startFlashing = useCallback(() => {
    if (intervalRef.current !== null) return;
    originalTitleRef.current = document.title.replace(FLASH_TITLE, "").trim() || "GRTI";
    let toggle = false;
    intervalRef.current = window.setInterval(() => {
      toggle = !toggle;
      document.title = toggle ? FLASH_TITLE : originalTitleRef.current;
    }, 1000);
  }, []);

  // Stop flashing when tab gains focus or user enters Chamados em Aberto
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") stopFlashing();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [stopFlashing]);

  useEffect(() => {
    if (STOP_ROUTES.includes(location.pathname)) stopFlashing();
  }, [location.pathname, stopFlashing]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !profile?.organization_id || !canUseAdminAlert) return;

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
          const t = payload.new as { id?: string; created_by?: string; title?: string; status?: string };
          if (!t) return;
          if (t.created_by === user.id) return;

          playAlert();
          const goToTicket = () => {
            if (t.id) navigate(`/chamados-abertos?open=${t.id}`);
            else navigate("/chamados-abertos");
          };
          toast("🔔 Novo chamado aberto", {
            description: (t.title || "Sem título") + " — clique para abrir",
            duration: 8000,
            onDismiss: () => {},
            action: {
              label: "Abrir",
              onClick: goToTicket,
            },
            onAutoClose: () => {},
            // sonner: clicking the toast body
            // @ts-expect-error sonner supports onClick on toast
            onClick: goToTicket,
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
  }, [user?.id, profile?.organization_id, canUseAdminAlert, navigate, startFlashing, stopFlashing]);
}

/** Dispara o alerta manualmente (botão de teste). */
export function triggerTestAlert() {
  try {
    const audio = new Audio(alertSound);
    audio.volume = 0.6;
    audio.play().catch((err) => {
      toast.error("Navegador bloqueou o som. Interaja com a página e tente de novo.");
      console.warn("[notifier:test] autoplay bloqueado:", err?.message || err);
    });
  } catch (e) {
    toast.error("Falha ao iniciar o som de alerta.");
    console.warn("[notifier:test] erro:", e);
  }
  toast("🔔 Novo chamado aberto (teste)", {
    description: "Som e flash de título disparados manualmente.",
    duration: 4000,
  });
  // Flash do título por 3s
  const original = document.title.replace(FLASH_TITLE, "").trim() || "GRTI";
  let toggle = false;
  const id = window.setInterval(() => {
    toggle = !toggle;
    document.title = toggle ? FLASH_TITLE : original;
  }, 700);
  window.setTimeout(() => {
    window.clearInterval(id);
    document.title = original;
  }, 3000);
}
