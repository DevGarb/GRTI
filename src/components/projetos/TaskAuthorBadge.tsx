import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TaskStatusAuthor } from "@/hooks/useTaskStatusAuthors";

function initial(name: string | null) {
  const c = (name ?? "").trim().charAt(0);
  return c ? c.toUpperCase() : "—";
}

export default function TaskAuthorBadge({ author }: { author?: TaskStatusAuthor }) {
  const label = author
    ? `${author.name ?? "Autor não registrado"} · ${author.status} · ${new Date(author.changed_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
    : "Sem registro de mudança de status";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
              author?.name
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {initial(author?.name ?? null)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
