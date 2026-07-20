import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, User, Shield, ArrowRight, HardHat } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useMaintTechnicians } from "@/hooks/useMaintTechnicians";
import { useDeliveryRequesters } from "@/hooks/useDeliveryRequesters";
import { useManutencaoProfile } from "@/contexts/ManutencaoProfileContext";
import { toast } from "sonner";
import "./cearagps.css";

export default function ManutencaoPin() {
  const navigate = useNavigate();
  const { profile: authProfile, hasRole, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin || hasRole("admin");
  const { items: technicians } = useMaintTechnicians();
  const { items: requesters } = useDeliveryRequesters();
  const { setProfile } = useManutencaoProfile();

  const [techPin, setTechPin] = useState("");
  const [reqPin, setReqPin] = useState("");

  const activeTechnicians = technicians.filter((m) => m.is_active !== false);
  const activeRequesters = requesters.filter((r) => r.is_active);

  const loginAdmin = () => {
    if (!isAdmin) return toast.error("Você não tem permissão de administrador");
    setProfile({ type: "admin", name: authProfile?.full_name || "Administrador" });
    navigate("/op/manutencao");
  };

  const loginTech = () => {
    const pin = techPin.trim();
    if (!pin) return toast.error("Informe o PIN");
    const matches = activeMechanics.filter((m) => (m as any).pin && (m as any).pin === pin);
    if (matches.length === 0) return toast.error("PIN inválido");
    if (matches.length > 1) return toast.error("PIN duplicado. Contate o admin.");
    const m = matches[0];
    setProfile({ type: "tecnico", id: m.id, name: m.name, phone: m.phone });
    navigate("/op/manutencao");
  };

  const loginRequester = () => {
    const pin = reqPin.trim();
    if (!pin) return toast.error("Informe o PIN");
    const matches = activeRequesters.filter((r) => r.pin && r.pin === pin);
    if (matches.length === 0) return toast.error("PIN inválido");
    if (matches.length > 1) return toast.error("PIN duplicado. Contate o admin.");
    const r = matches[0];
    setProfile({ type: "solicitante", id: r.id, name: r.name, phone: r.phone });
    navigate("/op/manutencao");
  };

  return (
    <div className="cgps-scope min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, hsl(191 74% 20%), hsl(191 74% 12%))" }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center" style={{ background: "hsl(191 74% 20%)" }}>
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <span className="text-white text-xl font-bold">Manutenção Predial</span>
          </div>
          <p className="text-white/80 text-sm">Acesso por PIN</p>
        </div>

        <Tabs defaultValue="tecnico" className="p-6">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="tecnico"><HardHat className="h-3.5 w-3.5 mr-1" />Técnico</TabsTrigger>
            <TabsTrigger value="solicitante"><User className="h-3.5 w-3.5 mr-1" />Solicitante</TabsTrigger>
            <TabsTrigger value="admin"><Shield className="h-3.5 w-3.5 mr-1" />Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="tecnico" className="space-y-3">
            <div>
              <Label>PIN do técnico</Label>
              <Input
                type="password" inputMode="numeric" maxLength={6}
                value={techPin}
                onChange={(e) => setTechPin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && loginTech()}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-14"
                autoFocus
              />
            </div>
            <Button onClick={loginTech} className="w-full cgps-btn-primary">
              Entrar como técnico <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </TabsContent>

          <TabsContent value="solicitante" className="space-y-3">
            <div>
              <Label>PIN do solicitante</Label>
              <Input
                type="password" inputMode="numeric" maxLength={6}
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
              Acesso liberado se você já está logado como administrador do sistema.
              <div className="mt-2 text-xs">Usuário atual: <strong>{authProfile?.full_name || "—"}</strong></div>
            </div>
            <Button onClick={loginAdmin} className="w-full cgps-btn-primary" disabled={!isAdmin}>
              Entrar como administrador <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            {!isAdmin && <p className="text-xs text-destructive text-center">Seu usuário não é administrador.</p>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
