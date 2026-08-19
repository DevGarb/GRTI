import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, HardHat, ShoppingCart, Shield, ArrowRight, CalendarPlus } from "lucide-react";
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

export default function OficinaPin() {
  const navigate = useNavigate();
  const { profile: authProfile, hasRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || hasRole("admin");
  const { items: staff } = useMechanics();
  const { setProfile } = useOficinaProfile();

  const [mecPin, setMecPin] = useState("");
  const [compPin, setCompPin] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [motoPin, setMotoPin] = useState("");

  const loginAdmin = () => {
    if (!isAdmin && adminPin.trim() !== "0000") {
      toast.error("Você não tem permissão de administrador");
      return;
    }
    setProfile({ type: "admin", name: authProfile?.full_name || "Administrador" });
    navigate(oficinaRoleHome("admin"));
  };

  const loginByPin = (role: OficinaRole, pinValue: string) => {
    const pin = pinValue.trim();
    if (!pin) return toast.error("Informe o PIN");
    const matches = staff.filter(
      (m) => m.is_active !== false && (m as any).pin && (m as any).pin === pin,
    );
    if (matches.length === 0) return toast.error("PIN inválido");
    if (matches.length > 1) return toast.error("PIN duplicado. Contate o admin.");
    const m = matches[0];
    const mRole = ((m as any).role || "mecanico") as OficinaRole;
    if (mRole !== role) return toast.error("Este PIN pertence a outro perfil. Selecione a aba correta.");
    setProfile({ type: mRole, id: m.id, name: m.name, phone: m.phone });
    navigate(oficinaRoleHome(mRole));
  };

  return (
    <div className="cgps-scope min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, hsl(191 74% 20%), hsl(191 74% 12%))" }}>
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

        <Tabs defaultValue={isAdmin ? "admin" : "mecanico"} className="p-6">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="mecanico"><HardHat className="h-3.5 w-3.5 mr-1" />Mecânico</TabsTrigger>
            <TabsTrigger value="compras"><ShoppingCart className="h-3.5 w-3.5 mr-1" />Compras</TabsTrigger>
            <TabsTrigger value="motoloc"><CalendarPlus className="h-3.5 w-3.5 mr-1" />Motoloc</TabsTrigger>
            <TabsTrigger value="admin"><Shield className="h-3.5 w-3.5 mr-1" />Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="mecanico" className="space-y-3">
            <div>
              <Label>PIN do mecânico</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={mecPin}
                onChange={(e) => setMecPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && loginByPin("mecanico", mecPin)}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-14"
                autoFocus
              />
            </div>
            <Button onClick={() => loginByPin("mecanico", mecPin)} className="w-full cgps-btn-primary">
              Entrar como mecânico <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </TabsContent>

          <TabsContent value="compras" className="space-y-3">
            <div>
              <Label>PIN de compras</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={compPin}
                onChange={(e) => setCompPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && loginByPin("compras", compPin)}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-14"
              />
            </div>
            <Button onClick={() => loginByPin("compras", compPin)} className="w-full cgps-btn-primary">
              Entrar como compras <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </TabsContent>

          <TabsContent value="motoloc" className="space-y-3">
            <div>
              <Label>PIN Motoloc</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={motoPin}
                onChange={(e) => setMotoPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && loginByPin("motoloc", motoPin)}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-14"
              />
            </div>
            <Button onClick={() => loginByPin("motoloc", motoPin)} className="w-full cgps-btn-primary">
              Entrar como Motoloc <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </TabsContent>

          <TabsContent value="admin" className="space-y-3">
            <div className="text-sm text-muted-foreground bg-slate-50 rounded-md p-3 border">
              Acesso liberado por perfil administrador ou PIN de administrador.
              <div className="mt-2 text-xs">Usuário atual: <strong>{authProfile?.full_name || "—"}</strong></div>
            </div>
            {!isAdmin && (
              <div>
                <Label>PIN de administrador</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && loginAdmin()}
                  placeholder="••••"
                  className="text-center text-2xl tracking-[0.5em] h-14"
                />
              </div>
            )}
            <Button onClick={loginAdmin} className="w-full cgps-btn-primary">
              Entrar como administrador <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            {!isAdmin && <p className="text-xs text-muted-foreground text-center">Use o PIN 0000 para acesso administrativo do módulo.</p>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
