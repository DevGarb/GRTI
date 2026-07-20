import { useNavigate } from "react-router-dom";
import { Wrench, LogOut } from "lucide-react";
import { useManutencaoProfile } from "@/contexts/ManutencaoProfileContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import "./cearagps.css";

export default function ManutencaoNav() {
  const navigate = useNavigate();
  const { profile, clear } = useManutencaoProfile();

  const roleColor =
    profile?.type === "admin" ? "bg-slate-800 text-white"
    : profile?.type === "tecnico" ? "bg-amber-500 text-white"
    : "bg-emerald-600 text-white";

  const logout = () => { clear(); navigate("/op/manutencao/pin"); };

  return (
    <div className="cgps-scope border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 py-3 mr-2">
          <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: "hsl(191 74% 20%)" }}>
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm" style={{ color: "hsl(191 74% 20%)" }}>Manutenção Predial</span>
        </div>
        <div className="flex-1" />
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
