import { NavLink, Outlet } from "react-router-dom";
import { Target, User, Trophy, ShieldAlert, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTmaAnomalies } from "@/hooks/useTmaAnomalies";

const tabs = [
  { to: "/metas", label: "Desempenho", icon: Target, end: true },
  { to: "/metas/meu-mvp", label: "Meu MVP", icon: User },
  { to: "/metas/mvp", label: "MVP Equipe", icon: Trophy, adminOnly: true },
  { to: "/metas/penalidades", label: "Penalidades", icon: ShieldAlert, adminOnly: true },
  { to: "/metas/revisao-tma", label: "Revisão TMA", icon: Activity, adminOnly: true, badge: true },
];

export default function MetasLayout() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin") || hasRole("desenvolvedor" as any);
  const { data: anomalies = [] } = useTmaAnomalies();
  const highSeverityCount = anomalies.filter(a => a.severity === "critica" || a.severity === "alta").length;
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
            {t.badge && highSeverityCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-semibold text-white min-w-[18px] h-[18px]">
                {highSeverityCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
