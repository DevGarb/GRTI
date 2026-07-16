import { NavLink, useLocation } from "react-router-dom";
import { Truck, Users, Tags, LayoutGrid } from "lucide-react";
import "./cearagps.css";

const TABS = [
  { to: "/op/entregas", label: "Kanban", icon: LayoutGrid },
  { to: "/op/entregas/motoristas", label: "Motoristas", icon: Users },
  { to: "/op/entregas/categorias", label: "Categorias", icon: Tags },
];

export default function EntregasNav() {
  const { pathname } = useLocation();
  return (
    <div className="cgps-scope border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 py-3 mr-2">
          <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: "hsl(191 74% 20%)" }}>
            <Truck className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "hsl(191 74% 20%)" }}>
            Ceara<span style={{ color: "hsl(14 82% 51%)" }}>GPS</span>
          </span>
        </div>
        <nav className="flex items-center">
          {TABS.map(t => {
            const active = pathname === t.to;
            const Icon = t.icon;
            return (
              <NavLink key={t.to} to={t.to} className="cgps-tab flex items-center gap-1.5" data-active={active}>
                <Icon className="h-4 w-4" />
                {t.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
