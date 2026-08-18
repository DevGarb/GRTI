import { UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOrgTechnicians } from "@/hooks/useProjectDelivery";

interface Props {
  value: string | null | undefined;
  onChange: (userId: string | null) => void;
}

/** Atribui manualmente o crédito da entrega de um backlog. */
export default function CreditSelect({ value, onChange }: Props) {
  const { data: techs = [] } = useOrgTechnicians();
  const current = techs.find((t) => t.user_id === value);
  const label = current ? `Entrega creditada a ${current.full_name}` : "Atribuir entrega a…";

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  value
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground"
                }`}
                aria-label={label}
              >
                <UserCheck className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        <DropdownMenuLabel className="text-xs">Crédito da entrega</DropdownMenuLabel>
        <DropdownMenuItem className="text-xs" onSelect={() => onChange(null)}>
          Automático (quem concluiu)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {techs.map((t) => (
          <DropdownMenuItem key={t.user_id} className="text-xs" onSelect={() => onChange(t.user_id)}>
            {t.full_name}
            {t.user_id === value && <span className="ml-auto text-emerald-600">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
