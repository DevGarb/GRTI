import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Wrench, LogOut, LayoutGrid, ShoppingCart, ClipboardList, Award, ShieldAlert, Calendar, CalendarPlus, CheckCircle2, ShieldCheck, Settings2, Star, ChevronLeft, Menu } from "lucide-react";
import { useOficinaProfile } from "@/contexts/OficinaProfileContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OFICINA_ROLE_BADGE, oficinaRoleInfo } from "@/lib/oficinaRoles";
import "./cearagps.css";

export default function OficinaNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, clear } = useOficinaProfile();

  const type = profile?.type;
  const TABS =
    type === "mecanico"
      ? [
          { to: "/op/oficina/minhas", label: "Meus serviços", icon: ClipboardList },
          { to: "/op/oficina/agenda", label: "Minha agenda", icon: Calendar },
          { to: "/op/oficina/meus-pontos", label: "Meus pontos", icon: Star },
        ]
      : type === "compras"
      ? [{ to: "/op/oficina/compras", label: "Compras & Peças", icon: ShoppingCart }]
      : type === "motoloc"
      ? [
          { to: "/op/oficina/agendar", label: "Agendar manutenção", icon: CalendarPlus },
          { to: "/op/oficina/finalizadas", label: "Serviços finalizados", icon: CheckCircle2 },
        ]
      : [
          { to: "/op/oficina", label: "Quadro Kanban", icon: LayoutGrid },
          { to: "/op/oficina/agenda", label: "Agenda", icon: Calendar },
          { to: "/op/oficina/alertas", label: "Alertas", icon: ShieldAlert },
          { to: "/op/oficina/auditoria", label: "Auditoria", icon: ShieldCheck },
          { to: "/op/oficina/premiacoes", label: "Premiações", icon: Award },
          { to: "/op/oficina/pontuacao", label: "Pontuação", icon: Settings2 },
          { to: "/op/oficina/compras", label: "Compras", icon: ShoppingCart },
          { to: "/op/oficina/finalizadas", label: "Finalizadas", icon: CheckCircle2 },
        ];

  const logout = () => { clear(); navigate("/op/oficina/pin"); };

  return (
    <div className="cgps-scope border-b bg-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 py-3 mr-2">
          <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: "hsl(191 74% 20%)" }}>
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "hsl(191 74% 20%)" }}>Oficina</span>
        </div>
        <nav className="flex items-center flex-1 flex-wrap">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink key={t.to} to={t.to} className="cgps-tab flex items-center gap-1.5" data-active={pathname === t.to}>
                <Icon className="h-4 w-4" />
                {t.label}
              </NavLink>
            );
          })}
        </nav>
        {profile && (
          <div className="flex items-center gap-2 py-2">
            <Badge className={(OFICINA_ROLE_BADGE[profile.type] || "bg-slate-700 text-white") + " border-0"}>
              {oficinaRoleInfo(profile.type).label}
            </Badge>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">{profile.name}</span>
            <Button size="sm" variant="ghost" onClick={logout} className="text-slate-600">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
