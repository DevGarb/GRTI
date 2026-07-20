import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Truck, Users, Tags, LayoutGrid, LogOut, UserCircle2, ClipboardList, Star } from "lucide-react";
import { useEntregasProfile } from "@/contexts/EntregasProfileContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import "./cearagps.css";

export default function EntregasNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, clear } = useEntregasProfile();

  const isAdmin = profile?.type === "admin";
  const isSolicitante = profile?.type === "solicitante";

  const TABS = isAdmin
    ? [
        { to: "/op/entregas", label: "Kanban", icon: LayoutGrid },
        { to: "/op/entregas/motoristas", label: "Motoristas", icon: Users },
        { to: "/op/entregas/solicitantes", label: "Solicitantes", icon: UserCircle2 },
        { to: "/op/entregas/categorias", label: "Categorias", icon: Tags },
        { to: "/op/avaliacoes", label: "Avaliações", icon: Star },
      ]
    : isSolicitante
    ? [
        { to: "/op/entregas/solicitar", label: "Nova solicitação", icon: ClipboardList },
        { to: "/op/entregas/minhas", label: "Status da solicitação", icon: LayoutGrid },
      ]
    : [{ to: "/op/entregas/minhas", label: "Minhas entregas", icon: LayoutGrid }];

  const roleColor =
    profile?.type === "admin" ? "bg-slate-800 text-white"
    : profile?.type === "motorista" ? "bg-amber-500 text-white"
    : "bg-emerald-600 text-white";

  const logout = () => {
    clear();
    navigate("/op/entregas/pin");
  };

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
        <nav className="flex items-center flex-1 flex-wrap">
          {TABS.map((t) => {
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
        {profile && (
          <div className="flex items-center gap-2 py-2">
            <Badge className={roleColor + " border-0 capitalize"}>{profile.type}</Badge>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">{profile.name}</span>
            <Button size="sm" variant="ghost" onClick={logout} className="text-slate-600">
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
