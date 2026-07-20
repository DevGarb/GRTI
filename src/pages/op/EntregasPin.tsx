import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Bike, User, Shield, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useDrivers } from "@/hooks/useOperacional";
import { useDeliveryRequesters } from "@/hooks/useDeliveryRequesters";
import { useEntregasProfile } from "@/contexts/EntregasProfileContext";
import { toast } from "sonner";
import "./cearagps.css";

export default function EntregasPin() {
  const navigate = useNavigate();
  const { profile: authProfile, hasRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || hasRole("admin");
  const { items: drivers } = useDrivers();
  const { items: requesters } = useDeliveryRequesters();
  const { setProfile } = useEntregasProfile();

  const [driverPin, setDriverPin] = useState("");
  const [reqPin, setReqPin] = useState("");
  const [adminPin, setAdminPin] = useState("");

  const activeDrivers = drivers.filter((d) => d.is_active);
  const activeRequesters = requesters.filter((r) => r.is_active);

  const loginAdmin = () => {
    if (!isAdmin && adminPin.trim() !== "0000") {
      toast.error("Você não tem permissão de administrador");
      return;
    }
    setProfile({ type: "admin", name: authProfile?.full_name || "Administrador" });
    navigate("/op/entregas");
  };

  const loginDriver = () => {
    const pin = driverPin.trim();
    if (!pin) return toast.error("Informe o PIN");
    const matches = activeDrivers.filter((d) => d.pin && d.pin === pin);
    if (matches.length === 0) return toast.error("PIN inválido");
    if (matches.length > 1) return toast.error("PIN duplicado. Contate o admin.");
    const d = matches[0];
    setProfile({ type: "motorista", id: d.id, name: d.name, phone: d.phone });
    navigate("/op/entregas/minhas");
  };

  const loginRequester = () => {
    const pin = reqPin.trim();
    if (!pin) return toast.error("Informe o PIN");
    const matches = activeRequesters.filter((r) => r.pin && r.pin === pin);
    if (matches.length === 0) return toast.error("PIN inválido");
    if (matches.length > 1) return toast.error("PIN duplicado. Contate o admin.");
    const r = matches[0];
    setProfile({ type: "solicitante", id: r.id, name: r.name, phone: r.phone });
    navigate("/op/entregas/solicitar");
  };

  return (
    <div className="cgps-scope min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, hsl(191 74% 20%), hsl(191 74% 12%))" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center" style={{ background: "hsl(191 74% 20%)" }}>
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-white text-xl font-bold">
              Ceara<span style={{ color: "hsl(14 82% 60%)" }}>GPS</span>
            </span>
          </div>
          <p className="text-white/80 text-sm">Sistema de Controle de Entregas</p>
        </div>

        <Tabs defaultValue="motorista" className="p-6">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="motorista"><Bike className="h-3.5 w-3.5 mr-1" />Motorista</TabsTrigger>
            <TabsTrigger value="solicitante"><User className="h-3.5 w-3.5 mr-1" />Solicitante</TabsTrigger>
            <TabsTrigger value="admin"><Shield className="h-3.5 w-3.5 mr-1" />Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="motorista" className="space-y-3">
            <div>
              <Label>PIN do motorista</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={driverPin}
                onChange={(e) => setDriverPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && loginDriver()}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-14"
                autoFocus
              />
            </div>
            <Button onClick={loginDriver} className="w-full cgps-btn-primary">
              Entrar como motorista <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </TabsContent>

          <TabsContent value="solicitante" className="space-y-3">
            <div>
              <Label>PIN do solicitante</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={reqPin}
                onChange={(e) => setReqPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && loginRequester()}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-14"
              />
            </div>
            <Button onClick={loginRequester} className="w-full cgps-btn-primary">
              Entrar como solicitante <ArrowRight className="h-4 w-4 ml-1" />
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
