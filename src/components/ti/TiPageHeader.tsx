import { cn } from "@/lib/utils";

interface TiPageHeaderProps {
  /** Sobretítulo em mono/uppercase, igual ao usado no login. */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Botões/ações alinhados à direita no desktop. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Cabeçalho padrão das páginas da organização T.I.
 *
 * Replica exatamente a linguagem visual do Login / Escolher Organização:
 * sobretítulo mono com tracking largo, título com gradiente sky → cyan → violet
 * e descrição leve.
 */
export default function TiPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: TiPageHeaderProps) {
  return (
    <header
      data-testid="ti-page-header"
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="ti-eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          <span className="ti-title">{title}</span>
        </h1>
        {description && (
          <p className="mt-1 text-sm font-light text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
