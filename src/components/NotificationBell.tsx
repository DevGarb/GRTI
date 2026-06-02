import { Bell, MessageSquare, CheckCircle2, AlertCircle, UserPlus, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

function iconFor(type: string) {
  switch (type) {
    case "ticket_comment":
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case "ticket_resolved":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "ticket_status":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case "ticket_assigned":
      return <UserPlus className="h-4 w-4 text-violet-500" />;
    case "ticket_rejected":
      return <RotateCcw className="h-4 w-4 text-red-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { items, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleClick = (n: AppNotification) => {
    if (!n.read_at) markAsRead(n.id);
    if (n.ticket_id) navigate(`/chamados?open=${n.ticket_id}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex gap-2.5 hover:bg-muted/50 transition-colors",
                      !n.read_at && "bg-muted/30"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{iconFor(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{n.title}</span>
                        {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />}
                      </div>
                      {n.body && (
                        <p className="text-[11px] text-muted-foreground truncate">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
