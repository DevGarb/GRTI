import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, FolderKanban, ListTodo, Zap, Calendar, Trophy, User, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { to: "/projetos", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/projetos/lista", label: "Projetos", icon: FolderKanban },
  { to: "/projetos/backlog", label: "Backlog", icon: ListTodo },
  { to: "/projetos/sprints", label: "Sprints", icon: Zap },
  { to: "/projetos/calendario", label: "Calendário", icon: Calendar },
  { to: "/projetos/meu-mvp", label: "Meu MVP", icon: User },
  { to: "/projetos/mvp", label: "MVP Equipe", icon: Trophy },
  { to: "/projetos/penalidades", label: "Penalidades", icon: ShieldAlert, adminOnly: true },
];

export default function ProjetosLayout() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin") || hasRole("desenvolvedor" as any);
  const visible = tabs.filter((t) => !t.adminOnly || isAdmin);
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-1 border-b border-border pb-1">
        {visible.map((t) => (
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
      <Outlet />
    </div>
  );
}
