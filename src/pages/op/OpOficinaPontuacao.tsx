import { forwardRef, useState } from "react";
import { ClipboardList, Plus, Trash2, Star, Layers, Calculator, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompanies } from "@/hooks/useOperacional";
import { useServiceTypes, useExtraServices, useAwardTiers } from "@/hooks/useOficinaScoring";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { calcAward, formatPoints } from "@/lib/oficinaScoring";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import OficinaNav from "./OficinaNav";

/** Seletor de empresas (checkboxes) usado nos formulários desta página. */
const CompanyPicker = forwardRef<HTMLDivElement, {
  companies: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}>(function CompanyPicker({ companies, selected, onChange }, ref) {
  return (
    <div ref={ref} className="flex flex-wrap gap-2">
      {companies.map((c) => {
        const on = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(on ? selected.filter((id) => id !== c.id) : [...selected, c.id])}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition",
              on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
            )}
          >
            {c.name}
          </button>
        );
      })}
      {companies.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma empresa da oficina cadastrada.</span>}
    </div>
  );
});

export default function OpOficinaPontuacao() {
  const { items: allCompanies } = useCompanies();
  const companies = filterOficinaCompanies(allCompanies);
  const st = useServiceTypes();
  const ex = useExtraServices();
  const tiersHook = useAwardTiers();
  const { tiers } = tiersHook;

  // novo checklist
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");
  const [newTypeCompanies, setNewTypeCompanies] = useState<string[]>([]);
  // novo item (por tipo)
  const [newItem, setNewItem] = useState<Record<string, { label: string; points: string }>>({});
  // checklists expandidos (por padrão, ocultos)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  // novo adicional
  const [newExtraName, setNewExtraName] = useState("");
  const [newExtraPoints, setNewExtraPoints] = useState("0.25");
  const [newExtraCompanies, setNewExtraCompanies] = useState<string[]>([]);
  // nova faixa
  const [newTier, setNewTier] = useState({ label: "", from: "", to: "", rate: "" });
  // simulador
  const [simPoints, setSimPoints] = useState("70");
  const sim = calcAward(Number(simPoints) || 0, tiers);

  return (
    <div className="cgps-scope min-h-screen bg-slate-50">
      <OficinaNav />
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Pontuação & Checklists</h1>
        <p className="text-sm text-muted-foreground">
          Configure os checklists por tipo de serviço, os serviços adicionais e as faixas de premiação dos mecânicos.
        </p>
      </div>

      <Tabs defaultValue="checklists">
        <TabsList>
          <TabsTrigger value="checklists"><ClipboardList className="h-4 w-4 mr-1" /> Checklists por serviço</TabsTrigger>
          <TabsTrigger value="adicionais"><Star className="h-4 w-4 mr-1" /> Serviços adicionais</TabsTrigger>
          <TabsTrigger value="faixas"><Layers className="h-4 w-4 mr-1" /> Faixas de premiação</TabsTrigger>
        </TabsList>

        {/* ================= CHECKLISTS ================= */}
        <TabsContent value="checklists" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Novo checklist (tipo de serviço)</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Ex.: Revisão de freios" />
                </div>
                <div>
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Input value={newTypeDesc} onChange={(e) => setNewTypeDesc(e.target.value)} placeholder="Quando usar este checklist" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Empresas que usam este checklist</Label>
                <CompanyPicker companies={companies} selected={newTypeCompanies} onChange={setNewTypeCompanies} />
              </div>
              <Button
                size="sm"
                disabled={!newTypeName.trim() || newTypeCompanies.length === 0}
                onClick={() => {
                  st.addType(newTypeName, newTypeDesc, newTypeCompanies);
                  setNewTypeName(""); setNewTypeDesc(""); setNewTypeCompanies([]);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Criar checklist
              </Button>
            </CardContent>
          </Card>

          {st.types.map((t) => {
            const items = st.itemsByType[t.id] || [];
            const maxPts = st.maxPointsOf(t.id);
            const draft = newItem[t.id] || { label: "", points: "" };
            const open = !!expanded[t.id];
            return (
              <Card key={t.id} className={cn(!t.active && "opacity-60")}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(t.id)}
                        className="h-8 w-8 shrink-0 rounded-md border flex items-center justify-center hover:bg-muted transition"
                        aria-label={open ? `Ocultar itens de ${t.name}` : `Mostrar itens de ${t.name}`}
                      >
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <Input
                        defaultValue={t.name}
                        key={t.id + t.name}
                        className="h-8 font-semibold w-64"
                        onBlur={(e) => e.target.value.trim() && e.target.value !== t.name && st.updateType(t.id, { name: e.target.value.trim() })}
                      />
                      <Badge variant="secondary">{formatPoints(maxPts)} pts máx.</Badge>
                      <Badge variant="outline" className="text-[10px]">{items.length} {items.length === 1 ? "item" : "itens"}</Badge>
                      <button
                        type="button"
                        onClick={() => st.updateType(t.id, { active: !t.active })}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          t.active ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {t.active ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                    <Button
                      size="sm" variant="ghost"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm(`Excluir o checklist "${t.name}" e todos os seus ${items.length} itens?`)) st.removeType(t.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                    </Button>
                  </div>

                  {!open && t.description && (
                    <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                  )}

                  {open && (
                  <>
                  <div>
                    <Label className="text-xs">Empresas</Label>
                    <CompanyPicker
                      companies={companies}
                      selected={st.companyIdsByType[t.id] || []}
                      onChange={(ids) => st.setTypeCompanies(t.id, ids)}
                    />
                  </div>

                  <div className="space-y-1">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center gap-2">
                        <Input
                          defaultValue={it.label}
                          key={it.id + it.label}
                          className="h-8 text-sm"
                          onBlur={(e) => e.target.value.trim() && e.target.value !== it.label && st.updateItem(it.id, { label: e.target.value.trim() })}
                        />
                        <Input
                          type="number" step="0.05" min={0}
                          defaultValue={it.points}
                          key={it.id + "-" + it.points}
                          className="h-8 w-24 text-right"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (Number.isFinite(v) && v >= 0 && v !== Number(it.points)) st.updateItem(it.id, { points: v });
                          }}
                          aria-label={`Pontos de ${it.label}`}
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => st.removeItem(it.id)} aria-label="Remover item">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Input
                      value={draft.label}
                      onChange={(e) => setNewItem((p) => ({ ...p, [t.id]: { ...draft, label: e.target.value } }))}
                      placeholder="Novo item do checklist"
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number" step="0.05" min={0}
                      value={draft.points}
                      onChange={(e) => setNewItem((p) => ({ ...p, [t.id]: { ...draft, points: e.target.value } }))}
                      placeholder="Pts"
                      className="h-8 w-24 text-right"
                    />
                    <Button
                      size="sm" variant="outline"
                      disabled={!draft.label.trim()}
                      onClick={() => {
                        st.addItem(t.id, { label: draft.label, points: Number(draft.points) || 0 });
                        setNewItem((p) => ({ ...p, [t.id]: { label: "", points: "" } }));
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Incluir
                    </Button>
                  </div>
                  </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ================= ADICIONAIS ================= */}
        <TabsContent value="adicionais" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Novo serviço adicional</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={newExtraName} onChange={(e) => setNewExtraName(e.target.value)} placeholder="Ex.: Troca de vela" />
                </div>
                <div>
                  <Label className="text-xs">Pontos</Label>
                  <Input type="number" step="0.05" min={0} value={newExtraPoints} onChange={(e) => setNewExtraPoints(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Empresas</Label>
                <CompanyPicker companies={companies} selected={newExtraCompanies} onChange={setNewExtraCompanies} />
              </div>
              <Button
                size="sm"
                disabled={!newExtraName.trim() || newExtraCompanies.length === 0}
                onClick={() => {
                  ex.addExtra(newExtraName, Number(newExtraPoints) || 0, newExtraCompanies);
                  setNewExtraName(""); setNewExtraPoints("0.25"); setNewExtraCompanies([]);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Criar adicional
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              {ex.extras.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço adicional cadastrado.</p>}
              {ex.extras.map((e) => (
                <div key={e.id} className={cn("border rounded-md p-3 space-y-2", !e.active && "opacity-60")}>
                  <div className="flex items-center gap-2">
                    <Input
                      defaultValue={e.name}
                      key={e.id + e.name}
                      className="h-8 text-sm"
                      onBlur={(ev) => ev.target.value.trim() && ev.target.value !== e.name && ex.updateExtra(e.id, { name: ev.target.value.trim() })}
                    />
                    <Input
                      type="number" step="0.05" min={0}
                      defaultValue={e.points}
                      key={e.id + "-" + e.points}
                      className="h-8 w-24 text-right"
                      onBlur={(ev) => {
                        const v = Number(ev.target.value);
                        if (Number.isFinite(v) && v >= 0 && v !== Number(e.points)) ex.updateExtra(e.id, { points: v });
                      }}
                      aria-label={`Pontos de ${e.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => ex.updateExtra(e.id, { active: !e.active })}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border shrink-0",
                        e.active ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {e.active ? "Ativo" : "Inativo"}
                    </button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => ex.removeExtra(e.id)} aria-label="Remover adicional">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <CompanyPicker
                    companies={companies}
                    selected={ex.companyIdsByExtra[e.id] || []}
                    onChange={(ids) => ex.setExtraCompanies(e.id, ids)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= FAIXAS ================= */}
        <TabsContent value="faixas" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium">Faixas progressivas (valor por ponto)</p>
              <p className="text-xs text-muted-foreground">
                A premiação é calculada faixa a faixa: os primeiros pontos valem a taxa da faixa inicial, os seguintes valem a taxa da próxima, e assim por diante. Deixe "até" vazio na última faixa (sem teto).
              </p>
              {tiers.map((t) => (
                <div key={t.id} className={cn("flex items-center gap-2 border rounded-md p-2 flex-wrap", !t.active && "opacity-60")}>
                  <Input
                    type="text" placeholder="Nome"
                    defaultValue={t.label}
                    key={t.id + "-label-" + t.label}
                    className="h-8 w-28 text-sm"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== t.label) tiersHook.updateTier(t.id, { label: v });
                    }}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">de</span>
                  <Input
                    type="number" step="1" min={0}
                    defaultValue={t.from_points}
                    key={t.id + "-" + t.from_points}
                    className="h-8 w-20 text-right"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v !== Number(t.from_points)) tiersHook.updateTier(t.id, { from_points: v });
                    }}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">até</span>
                  <Input
                    type="number" step="1" min={0}
                    defaultValue={t.to_points ?? ""}
                    key={t.id + "-" + String(t.to_points)}
                    placeholder="∞"
                    className="h-8 w-20 text-right"
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      if (v !== t.to_points) tiersHook.updateTier(t.id, { to_points: v });
                    }}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">pts · R$</span>
                  <Input
                    type="number" step="0.5" min={0}
                    defaultValue={t.rate_brl}
                    key={t.id + "-" + t.rate_brl}
                    className="h-8 w-24 text-right"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 0 && v !== Number(t.rate_brl)) tiersHook.updateTier(t.id, { rate_brl: v });
                    }}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">/ponto</span>
                  <button
                    type="button"
                    onClick={() => tiersHook.updateTier(t.id, { active: !t.active })}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border shrink-0",
                      t.active ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/40" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.active ? "Ativa" : "Inativa"}
                  </button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => tiersHook.removeTier(t.id)} aria-label="Remover faixa">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Nova:</span>
                <Input type="text" placeholder="Nome" value={newTier.label} onChange={(e) => setNewTier((p) => ({ ...p, label: e.target.value }))} className="h-8 w-28 text-sm" />
                <Input type="number" placeholder="de" value={newTier.from} onChange={(e) => setNewTier((p) => ({ ...p, from: e.target.value }))} className="h-8 w-20 text-right" />
                <Input type="number" placeholder="até (∞ vazio)" value={newTier.to} onChange={(e) => setNewTier((p) => ({ ...p, to: e.target.value }))} className="h-8 w-24 text-right" />
                <Input type="number" placeholder="R$/ponto" value={newTier.rate} onChange={(e) => setNewTier((p) => ({ ...p, rate: e.target.value }))} className="h-8 w-24 text-right" />
                <Button
                  size="sm" variant="outline"
                  disabled={!newTier.label || !newTier.from || !newTier.rate}
                  onClick={() => {
                    tiersHook.addTier({
                      label: newTier.label.trim(),
                      from_points: Number(newTier.from),
                      to_points: newTier.to === "" ? null : Number(newTier.to),
                      rate_brl: Number(newTier.rate),
                    });
                    setNewTier({ label: "", from: "", to: "", rate: "" });
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Incluir faixa
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1"><Calculator className="h-4 w-4" /> Simulador</p>
              <div className="flex items-center gap-2">
                <Input type="number" step="0.5" min={0} value={simPoints} onChange={(e) => setSimPoints(e.target.value)} className="h-8 w-28 text-right" />
                <span className="text-xs text-muted-foreground">pontos no mês</span>
                <Badge className="bg-emerald-600 text-white">R$ {sim.total.toFixed(2)}</Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {sim.breakdown.map((b) => (
                  <div key={b.tier.id}>
                    {formatPoints(b.points)} pts × R$ {Number(b.tier.rate_brl).toFixed(2)} = R$ {b.amount.toFixed(2)}
                    {" "}(faixa {b.tier.from_points}–{b.tier.to_points ?? "∞"})
                  </div>
                ))}
                {sim.breakdown.length === 0 && <div>Nenhuma faixa ativa para simular.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
