import { useSprintHistory } from "@/hooks/useSprintHistory";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Minus,
  Edit3,
  Activity,
  History,
  AlertCircle,
} from "lucide-react";

interface Props {
  sprintId: string;
}

const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  ticket_added: { label: "Chamado adicionado", icon: Plus, color: "text-emerald-600" },
  ticket_removed: { label: "Chamado removido", icon: Minus, color: "text-rose-600" },
  points_changed: { label: "Pontos alterados", icon: Edit3, color: "text-blue-600" },
  status_changed: { label: "Status alterado", icon: Activity, color: "text-amber-600" },
  capacity_changed: { label: "Capacidade alterada", icon: Edit3, color: "text-purple-600" },
};

export default function SprintHistoryTimeline({ sprintId }: Props) {
  const { data: entries = [], isLoading } = useSprintHistory(sprintId);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground text-center">Carregando histórico...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        Nenhuma alteração registrada nesta sprint ainda.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {entries.map((e) => {
        const meta = ACTION_META[e.action] || { label: e.action, icon: AlertCircle, color: "text-muted-foreground" };
        const Icon = meta.icon;
        return (
          <div key={e.id} className="p-3 flex items-start gap-3 text-sm">
            <Icon className={`h-4 w-4 mt-0.5 ${meta.color} shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{meta.label}</span>
                {e.new_value?.title && (
                  <span className="text-muted-foreground truncate">— {e.new_value.title}</span>
                )}
                {e.old_value?.title && !e.new_value?.title && (
                  <span className="text-muted-foreground truncate">— {e.old_value.title}</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{e.userName || "Sistema"}</span>
                <span>·</span>
                <span>{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                {e.action === "points_changed" && (
                  <Badge variant="outline" className="text-[10px]">
                    {e.old_value?.story_points} → {e.new_value?.story_points}
                  </Badge>
                )}
                {e.action === "status_changed" && (
                  <Badge variant="outline" className="text-[10px]">
                    {e.old_value?.status} → {e.new_value?.status}
                  </Badge>
                )}
                {e.action === "capacity_changed" && (
                  <Badge variant="outline" className="text-[10px]">
                    {e.old_value?.capacity_points} → {e.new_value?.capacity_points} pts
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
