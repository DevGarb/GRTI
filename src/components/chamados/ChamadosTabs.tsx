import { NavLink } from "react-router-dom";
import { Ticket as TicketIcon, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/chamados", label: "Meus Chamados", icon: TicketIcon, end: true },
  { to: "/chamados-abertos", label: "Em Aberto", icon: Clock },
  { to: "/chamados/calendario", label: "Calendário", icon: Calendar },
];

export default function ChamadosTabs() {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border pb-1 -mt-2">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )
          }
        >
          <t.icon className="h-4 w-4" />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
