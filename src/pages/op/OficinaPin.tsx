import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, ArrowRight, HardHat, Star, Shield, ShoppingCart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useMechanics } from "@/hooks/useOficina";
import { useOficinaProfile } from "@/contexts/OficinaProfileContext";
import { oficinaRoleHome, type OficinaRole } from "@/lib/oficinaRoles";
import { toast } from "sonner";
import "./cearagps.css";

const TABS: { id: OficinaRole; label: string; icon: any }[] = [
  { id: "mecanico", label: "Mecânico", icon: HardHat },
  { id: "lider", label: "Líder", icon: Star },
  { id: "supervisor", label: "Supervisor", icon: Shield },
  { id: "compras", label: "Compras", icon: ShoppingCart },
];

export default function OficinaPin() {
  const navigate = useNavigate();
  const { profile: authProfile, hasRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || hasRole("admin");
  const { items: staff } = useMechanics();
  const { setProfile } = useOficinaProfile();

  const [pins, setPins] = useState<Record<string, string>>({});

  const setPin = (role: string, v: string) =>
    setPins((p) => ({ ...p, [role]: v.replace(/\D/g, "") }));

  const login = (role: OficinaRole) => {
    const pin = (pins[role] || "").trim();
    if (!pin) return toast.error("Informe o PIN");

    // Acesso administrativo de supervisão
    if ((role === "supervisor" || role === "lider") && pin === "0000" && isAdmin) {
      setProfile({ type: role, name: authProfile?.full_name || "Supervisor" });
      return navigate(oficinaRoleHome(role));
    }

    const matches = staff.filter(
      (m) => m.is_active !== false && (m as any).pin && (m as any).pin === pin,
    );
    if (matches.length === 0) return toast.error("PIN inválido");
    if (matches.length > 1) return toast.error("PIN duplicado. Contate o supervisor.");
    const m = matches[0];
    const mRole = ((m as any).role || "mecanico") as OficinaRole;
    if (mRole !== role) {
      return toast.error(`Este PIN pertence a um perfil de ${mRole}. Selecione a aba correta.`);
    }
    setProfile({ type: mRole, id: m.id, name: m.name, phone: m.phone });
    navigate(oficinaRoleHome(mRole));
  };

  return (
    <div
      className="cgps-scope min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, hsl(191 74% 20%), hsl(191 74% 12%))" }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center" style={{ background: "hsl(191 74% 20%)" }}>
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <span className="text-white text-xl font-bold">Oficina</span>
          </div>
          <p className="text-white/80 text-sm">Acesso por PIN</p>
        </div>

        <Tabs defaultValue="mecanico" className="p-6">
          <TabsList className="grid grid-cols-4 mb-6">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="text-xs px-1">
                <t.icon className="h-3.5 w-3.5 mr-1" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.id} value={t.id} className="space-y-3">
              <div>
                <Label>PIN de {t.label.toLowerCase()}</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pins[t.id] || ""}
                  onChange={(e) => setPin(t.id, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && login(t.id)}
                  placeholder="••••"
                  className="text-center text-2xl tracking-[0.5em] h-14"
                />
              </div>
              <Button onClick={() => login(t.id)} className="w-full cgps-btn-primary">
                Entrar como {t.label.toLowerCase()} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              {(t.id === "supervisor" || t.id === "lider") && isAdmin && (
                <p className="text-xs text-muted-foreground text-center">
                  Administradores podem usar o PIN 0000.
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
