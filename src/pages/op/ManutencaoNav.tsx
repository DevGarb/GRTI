import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Wrench, LogOut, ClipboardList, LayoutGrid, Star, Building2, Download } from "lucide-react";
import { useManutencaoProfile } from "@/contexts/ManutencaoProfileContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import "./cearagps.css";

type NavTab = { to: string; label: string; icon: typeof LayoutGrid; tab?: string };

export default function ManutencaoNav({ onReport }: { onReport?: () => void }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { profile, clear } = useManutencaoProfile();

  const isSolicitante = profile?.type === "solicitante";
  const isTecnico = profile?.type === "tecnico";
  const activeTab = new URLSearchParams(search).get("tab") || "ordens";

  const TABS: NavTab[] = isSolicitante
    ? [
        { to: "/op/manutencao/solicitar", label: "Nova solicitação", icon: ClipboardList },
        { to: "/op/manutencao/minhas", label: "Status da solicitação", icon: LayoutGrid },
      ]
    : isTecnico
    ? [{ to: "/op/manutencao/minhas", label: "Minhas OMs", icon: LayoutGrid }]
    : [
        { to: "/op/manutencao", label: "Ordens de Manutenção", icon: LayoutGrid, tab: "ordens" },
        { to: "/op/manutencao?tab=sedes", label: "Sedes", icon: Building2, tab: "sedes" },
        { to: "/op/avaliacoes", label: "Avaliações", icon: Star },
      ];

  const roleColor =
    profile?.type === "admin" ? "bg-slate-800 text-white"
    : profile?.type === "tecnico" ? "bg-amber-500 text-white"
    : "bg-emerald-600 text-white";

  const logout = () => { clear(); navigate("/op/manutencao/pin"); };

  const isActive = (t: NavTab) => {
    const base = t.to.split("?")[0];
    if (t.tab) return pathname === base && activeTab === t.tab;
    return pathname === t.to;
  };

  return (
    <div className="cgps-scope border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 py-3 mr-2">
          <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: "hsl(191 74% 20%)" }}>
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "hsl(191 74% 20%)" }}>Manutenção Predial</span>
        </div>
        <nav className="flex items-center flex-1 flex-wrap">
          {TABS.map((t, i) => {
            const active = isActive(t);
            const Icon = t.icon;
            if (i === TABS.length - 1 && onReport && pathname === "/op/manutencao" && !isSolicitante && !isTecnico) {
              return (
                <div key={t.to + t.label} className="flex items-center">
                  <button
                    className="cgps-tab flex items-center gap-1.5"
                    onClick={onReport}
                    title="Exportar relatório do período filtrado"
                  >
                    <Download className="h-4 w-4" />
                    Relatório
                  </button>
                  <NavLink to={t.to} className="cgps-tab flex items-center gap-1.5" data-active={active}>
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </NavLink>
                </div>
              );
            }
            return (
              <NavLink key={t.to + t.label} to={t.to} className="cgps-tab flex items-center gap-1.5" data-active={active}>
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
