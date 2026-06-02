import { useState } from "react";
import { Bell, MessageSquare, CheckCircle2, AlertCircle, UserPlus, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications, type AppNotification, type NotificationGroup } from "@/hooks/useNotifications";

function iconFor(type: string, className = "h-4 w-4") {
  switch (type) {
    case "ticket_comment":
      return <MessageSquare className={cn(className, "text-blue-500")} />;
    case "ticket_resolved":
      return <CheckCircle2 className={cn(className, "text-emerald-500")} />;
    case "ticket_status":
      return <AlertCircle className={cn(className, "text-amber-500")} />;
    case "ticket_assigned":
      return <UserPlus className={cn(className, "text-violet-500")} />;
    case "ticket_rejected":
      return <RotateCcw className={cn(className, "text-red-500")} />;
    default:
      return <Bell className={cn(className, "text-muted-foreground")} />;
  }
}

const TYPE_ORDER = ["ticket_comment", "ticket_status", "ticket_assigned", "ticket_resolved", "ticket_rejected"];

export default function NotificationBell() {
  const navigate = useNavigate();
  const { groups, unreadCount, markAsRead, markGroupAsRead, markAllAsRead } = useNotifications();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGroupClick = (g: NotificationGroup) => {
    if (g.ticket_id) {
      if (g.unreadCount > 0) markGroupAsRead(g.ticket_id);
      navigate(`/chamados?open=${g.ticket_id}`);
    } else {
      if (!g.latest.read_at) markAsRead(g.latest.id);
    }
  };

  const handleItemClick = (n: AppNotification) => {
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
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[440px]">
          {groups.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {groups.map((g) => {
                const isExpanded = expanded.has(g.key);
                const types = Object.keys(g.typeCounts).sort(
                  (a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)
                );
                return (
                  <li key={g.key}>
                    <div
                      className={cn(
                        "w-full px-3 py-2.5 flex gap-2.5 hover:bg-muted/50 transition-colors",
                        g.unreadCount > 0 && "bg-muted/30"
                      )}
                    >
                      {g.count > 1 && g.ticket_id ? (
                        <button
                          onClick={() => toggleExpand(g.key)}
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label={isExpanded ? "Recolher" : "Expandir"}
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      ) : (
                        <div className="mt-0.5 shrink-0 w-3.5" />
                      )}
                      <button
                        onClick={() => handleGroupClick(g)}
                        className="flex-1 min-w-0 text-left flex gap-2.5"
                      >
                        <div className="mt-0.5 shrink-0">{iconFor(g.latest.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium truncate flex-1">{g.latest.title}</span>
                            {g.count > 1 && (
                              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {g.count}
                              </span>
                            )}
                            {g.unreadCount > 0 && (
                              <span className="shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                                {g.unreadCount}
                              </span>
                            )}
                          </div>
                          {g.count > 1 ? (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {types.map((t) => (
                                <span key={t} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  {iconFor(t, "h-3 w-3")}
                                  <span className="font-medium">{g.typeCounts[t]}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            g.latest.body && (
                              <p className="text-[11px] text-muted-foreground truncate">{g.latest.body}</p>
                            )
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(g.latest.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </button>
                    </div>
                    {isExpanded && g.count > 1 && (
                      <ul className="bg-muted/20 border-t">
                        {g.items.map((n) => (
                          <li key={n.id}>
                            <button
                              onClick={() => handleItemClick(n)}
                              className={cn(
                                "w-full text-left pl-10 pr-3 py-2 flex gap-2 hover:bg-muted/40 transition-colors",
                                !n.read_at && "bg-muted/30"
                              )}
                            >
                              <div className="mt-0.5 shrink-0">{iconFor(n.type, "h-3.5 w-3.5")}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] truncate flex-1">{n.body || n.title}</span>
                                  {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                                </p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
