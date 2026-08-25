import { ArrowRight, History } from "lucide-react";
import { useCardMoves, type CardMoveModule } from "@/hooks/useCardMoves";
import { stageInfo } from "@/lib/oficinaStages";
import { formatDateTimeBR } from "@/lib/dateFormat";

interface Props {
  module: CardMoveModule;
  cardId: string | null;
}

function columnLabel(module: CardMoveModule, value: string | null) {
  if (!value) return "—";
  if (module === "service_order") return stageInfo(value).label;
  return value;
}

export default function OpMoveLogPanel({ module, cardId }: Props) {
  const { data: moves, isLoading } = useCardMoves(module, cardId);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <History className="h-4 w-4 text-muted-foreground" />
        Histórico de movimentações
      </div>
      {isLoading && <div className="text-xs text-muted-foreground">Carregando…</div>}
      {!isLoading && (!moves || moves.length === 0) && (
        <div className="text-xs text-muted-foreground">Nenhuma movimentação registrada.</div>
      )}
      <ul className="space-y-1.5 max-h-56 overflow-y-auto">
        {(moves || []).map((m) => (
          <li key={m.id} className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap font-medium">
              <span>{columnLabel(module, m.from_column)}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span>{columnLabel(module, m.to_column)}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {formatDateTimeBR(m.created_at)} · {m.moved_by_name || "Sistema"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
