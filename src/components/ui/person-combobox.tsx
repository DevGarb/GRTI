import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface PersonOption {
  value: string;
  label: string;
}

interface PersonComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: PersonOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function PersonCombobox({
  value,
  onValueChange,
  options,
  placeholder = "Selecione uma pessoa…",
  searchPlaceholder = "Buscar pelo nome…",
  emptyMessage = "Nenhuma pessoa encontrada.",
}: PersonComboboxProps) {
  const [open, setOpen] = useState(false);
  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" })),
    [options],
  );
  const selected = sortedOptions.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between gap-2 px-3 font-normal"
        >
          <span className={cn("flex min-w-0 items-center gap-2", !selected && "text-muted-foreground")}>
            <UserRound className="h-4 w-4 shrink-0" />
            <span className="truncate">{selected?.label || placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0 z-[80]">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup heading={`${sortedOptions.length} pessoas · ordem alfabética`}>
              {sortedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="gap-2 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {option.label.trim().charAt(0).toLocaleUpperCase("pt-BR")}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <Check className={cn("h-4 w-4 shrink-0 text-primary", value === option.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}