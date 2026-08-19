import TiPageHeader from "@/components/ti/TiPageHeader";
import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Package, Search, Monitor, Laptop, Printer, Server, Calendar, User, MapPin,
  Plus, Pencil, Trash2, Wifi, Battery, Phone, MonitorSpeaker, HardDrive,
  Download, Upload, QrCode, ScanLine, ChevronRight, ChevronLeft, Printer as PrinterIcon,
  TicketCheck, CheckCircle2, Wrench, Archive,
} from "lucide-react";
import { usePatrimonio, useDeletePatrimonio, type PatrimonioItem } from "@/hooks/usePatrimonio";
import { usePreventivas } from "@/hooks/usePreventivas";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NewPatrimonioModal from "@/components/NewPatrimonioModal";
import EditPatrimonioModal from "@/components/EditPatrimonioModal";
import ImportPatrimonioModal from "@/components/ImportPatrimonioModal";
import PatrimonioQRCodeModal from "@/components/PatrimonioQRCodeModal";
import QRScannerModal from "@/components/QRScannerModal";
import { formatDateBR } from "@/lib/dateFormat";
import {
  assetUrl, generateTestQr, exportPatrimonioCsv, exportPatrimonioQrZip, exportPatrimonioLabelsPdf,
} from "@/lib/patrimonioExports";

const typeIcons: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-5 w-5" />,
  Notebook: <Laptop className="h-5 w-5" />,
  Impressora: <Printer className="h-5 w-5" />,
  Servidor: <Server className="h-5 w-5" />,
  Switch: <Wifi className="h-5 w-5" />,
  Roteador: <Wifi className="h-5 w-5" />,
  Nobreak: <Battery className="h-5 w-5" />,
  Monitor: <MonitorSpeaker className="h-5 w-5" />,
  "Telefone IP": <Phone className="h-5 w-5" />,
};

const statusColors: Record<string, string> = {
  Ativo: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Em manutenção": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Inativo: "bg-muted text-muted-foreground",
  Descartado: "bg-destructive/10 text-destructive",
};

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const rise: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

export default function PatrimonioTI() {
  const reduce = useReducedMotion();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<PatrimonioItem | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [qrItem, setQrItem] = useState<PatrimonioItem | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [testQrUrl, setTestQrUrl] = useState<string | null>(null);

  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("tecnico");
  const isAdmin = hasRole("admin");

  const { data: patrimonios = [], isLoading } = usePatrimonio();
  const { data: preventivas = [] } = usePreventivas();
  const deletePatrimonio = useDeletePatrimonio();

  const maintenanceMap = new Map<string, typeof preventivas>();
  preventivas.forEach((p) => {
    const list = maintenanceMap.get(p.asset_tag) || [];
    list.push(p);
    maintenanceMap.set(p.asset_tag, list);
  });

  const uniqueTypes = [...new Set(patrimonios.map((p) => p.equipment_type))].sort();

  const filtered = patrimonios.filter((item) => {
    const matchesSearch =
      !search ||
      item.asset_tag.toLowerCase().includes(search.toLowerCase()) ||
      item.equipment_type.toLowerCase().includes(search.toLowerCase()) ||
      (item.sector || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.responsible || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.model || "").toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "Todos" || item.equipment_type === filterType;
    const matchesStatus = filterStatus === "Todos" || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = [
    { label: "Total", value: patrimonios.length, Icon: TicketCheck, bar: "bg-sky-500", bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-600 dark:text-sky-400" },
    { label: "Ativos", value: patrimonios.filter((p) => p.status === "Ativo").length, Icon: CheckCircle2, bar: "bg-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
    { label: "Em manutenção", value: patrimonios.filter((p) => p.status === "Em manutenção").length, Icon: Wrench, bar: "bg-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
    { label: "Inativos", value: patrimonios.filter((p) => p.status === "Inativo" || p.status === "Descartado").length, Icon: Archive, bar: "bg-slate-400", bg: "bg-slate-100 dark:bg-slate-800/50", text: "text-slate-500 dark:text-slate-400" },
  ];

  // Módulos por tipo de equipamento: só quando sem busca e tipo=Todos.
  const showModules = filterType === "Todos" && !search;
  const modules = uniqueTypes
    .map((type) => {
      const items = filtered.filter((p) => p.equipment_type === type);
      return {
        type,
        count: items.length,
        ativos: items.filter((p) => p.status === "Ativo").length,
        manut: items.filter((p) => p.status === "Em manutenção").length,
        inativos: items.filter((p) => p.status === "Inativo" || p.status === "Descartado").length,
      };
    })
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count);

  const utilityBtn = "inline-flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground";

  return (
    <div className="max-w-7xl space-y-6">
      <motion.div variants={stagger} initial={reduce ? false : "hidden"} animate="show" className="space-y-6">
        {/* Header command bar */}
        <motion.div variants={rise} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.07] via-cyan-400/[0.04] to-violet-500/[0.07]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <TiPageHeader
              className="mb-0"
              eyebrow="Gestão de Ativos · Setor T.I"
              title="Patrimônio"
              description="Cadastro e histórico de todos os equipamentos."
            />

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <button
                  onClick={() => setShowModal(true)}
                  className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[hsl(207,95%,42%)] to-[hsl(190,90%,42%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_40px_-12px_hsl(199_95%_50%/0.6)] transition-all hover:shadow-[0_16px_48px_-12px_hsl(199_95%_55%/0.8)] active:scale-[0.98]"
                >
                  <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 opacity-0 blur-sm transition-all duration-700 group-hover/btn:left-[120%] group-hover/btn:opacity-100" />
                  <Plus className="relative h-4 w-4" />
                  <span className="relative">Novo Patrimônio</span>
                </button>
              )}
            </div>
          </div>

          {/* Toolbar utilitária */}
          <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <button onClick={() => setShowScanner(true)} className={utilityBtn}>
              <ScanLine className="h-4 w-4" /> Escanear
            </button>
            <button
              onClick={async () => { const url = await generateTestQr(patrimonios); if (url) setTestQrUrl(url); }}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-cyan-400/40 bg-background/60 px-3 py-2.5 text-sm font-medium text-cyan-600 backdrop-blur transition-colors hover:bg-cyan-500/5 dark:text-cyan-300"
            >
              <QrCode className="h-4 w-4" /> QR Teste
            </button>
            <button onClick={() => exportPatrimonioCsv(filtered)} className={utilityBtn}>
              <Download className="h-4 w-4" /> Exportar
            </button>
            <button onClick={() => exportPatrimonioQrZip(filtered)} className={utilityBtn}>
              <QrCode className="h-4 w-4" /> QR Lote
            </button>
            <button onClick={() => exportPatrimonioLabelsPdf(filtered)} className={utilityBtn}>
              <PrinterIcon className="h-4 w-4" /> Etiquetas PDF
            </button>
            {canEdit && (
              <button onClick={() => setShowImport(true)} className={utilityBtn}>
                <Upload className="h-4 w-4" /> Importar
              </button>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, Icon, bar, bg, text }) => (
            <motion.div key={label} variants={rise} className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono-tech text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
                  <p className={`font-display text-3xl font-bold ${text}`}>{value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-5 w-5 ${text}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filtros */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar patrimônio, marca, modelo..."
              className="w-full rounded-xl border border-input bg-background/60 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          >
            <option value="Todos">Todos os Tipos</option>
            {uniqueTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground transition-all focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
          >
            <option value="Todos">Todos Status</option>
            <option value="Ativo">Ativo</option>
            <option value="Em manutenção">Em manutenção</option>
            <option value="Inativo">Inativo</option>
            <option value="Descartado">Descartado</option>
          </select>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-12 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Carregando patrimônios...</p>
          </div>
        </div>
      ) : showModules ? (
        modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 shadow-sm">
            <Package className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum patrimônio encontrado.</p>
            {canEdit && (
              <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-primary hover:underline">Cadastrar primeiro patrimônio</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <button
                key={m.type}
                onClick={() => { setFilterType(m.type); setExpandedId(null); }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:shadow-md"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-gradient-to-br from-sky-500/15 to-cyan-400/10 text-cyan-600 dark:text-cyan-300">
                    {typeIcons[m.type] || <HardDrive className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display truncate font-semibold text-foreground">{m.type}</p>
                    <p className="font-mono-tech text-[11px] text-muted-foreground">{m.count} equipamento{m.count !== 1 ? "s" : ""}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-cyan-500" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{m.ativos} ativos
                  </span>
                  {m.manut > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{m.manut} manut.
                    </span>
                  )}
                  {m.inativos > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {m.inativos} inativos
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-12 shadow-sm">
          <Package className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum patrimônio encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filterType !== "Todos" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFilterType("Todos")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Voltar aos módulos
              </button>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/20 bg-gradient-to-br from-sky-500/15 to-cyan-400/10 text-cyan-600 dark:text-cyan-300">
                  {typeIcons[filterType] || <HardDrive className="h-4 w-4" />}
                </span>
                <h2 className="font-display text-sm font-semibold text-foreground">
                  {filterType} <span className="font-mono-tech font-normal text-muted-foreground">({filtered.length})</span>
                </h2>
              </div>
            </div>
          )}
          {filtered.map((item) => {
            const history = maintenanceMap.get(item.asset_tag) || [];
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="flex w-full cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-muted/40"
                >
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.asset_tag} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-gradient-to-br from-sky-500/15 to-cyan-400/10 text-cyan-600 dark:text-cyan-300">
                      {typeIcons[item.equipment_type] || <HardDrive className="h-5 w-5" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono-tech font-semibold text-foreground">{item.asset_tag}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.equipment_type}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[item.status] || "bg-muted text-muted-foreground"}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {(item.brand || item.model) && (<span>{[item.brand, item.model].filter(Boolean).join(" ")}</span>)}
                      {item.sector && (<span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.sector}</span>)}
                      {item.responsible && (<span className="flex items-center gap-1"><User className="h-3 w-3" />{item.responsible}</span>)}
                      {item.location && (<span>📍 {item.location}</span>)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">{history.length} manutenções</p>
                    {history.length > 0 && (
                      <p className="font-mono-tech text-xs text-muted-foreground">
                        Última: {formatDateBR(history.sort((a, b) => b.execution_date.localeCompare(a.execution_date))[0].execution_date)}
                      </p>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-4 border-t border-border bg-muted/30 p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      {item.serial_number && (
                        <div>
                          <p className="font-mono-tech text-[11px] uppercase tracking-widest text-muted-foreground">Nº Série</p>
                          <p className="font-mono-tech text-foreground">{item.serial_number}</p>
                        </div>
                      )}
                      <div>
                        <p className="font-mono-tech text-[11px] uppercase tracking-widest text-muted-foreground">Cadastrado em</p>
                        <p className="text-foreground">{formatDateBR(item.created_at)}</p>
                      </div>
                      {item.notes && (
                        <div className="col-span-2">
                          <p className="font-mono-tech text-[11px] uppercase tracking-widest text-muted-foreground">Observações</p>
                          <p className="text-foreground">{item.notes}</p>
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setQrItem(item); }}
                          className="rounded-lg border border-input px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                        >
                          <QrCode className="mr-1 inline h-3 w-3" /> QR Code
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                          className="rounded-lg border border-input px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                        >
                          <Pencil className="mr-1 inline h-3 w-3" /> Editar
                        </button>
                        <a
                          href={assetUrl(item.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg border border-input px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                        >
                          <ScanLine className="mr-1 inline h-3 w-3" /> Ver página pública
                        </a>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Tem certeza que deseja excluir este patrimônio?")) deletePatrimonio.mutate(item.id);
                            }}
                            className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="mr-1 inline h-3 w-3" /> Excluir
                          </button>
                        )}
                      </div>
                    )}

                    {history.length > 0 && (
                      <div>
                        <p className="mb-2 font-mono-tech text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Histórico de Manutenções</p>
                        <div className="space-y-2">
                          {history
                            .sort((a, b) => b.execution_date.localeCompare(a.execution_date))
                            .slice(0, 5)
                            .map((h) => {
                              const vals = Object.values(h.checklist);
                              const done = vals.filter(Boolean).length;
                              return (
                                <div key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                                  <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{formatDateBR(h.execution_date)}</p>
                                      <p className="text-xs text-muted-foreground">Técnico: {h.creatorName || "—"}</p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-medium text-foreground">{done}/{vals.length} itens</p>
                                </div>
                              );
                            })}
                          {history.length > 5 && (
                            <p className="text-center text-xs text-muted-foreground">+ {history.length - 5} manutenções anteriores</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && <NewPatrimonioModal onClose={() => setShowModal(false)} />}
      {editingItem && <EditPatrimonioModal patrimonio={editingItem} onClose={() => setEditingItem(null)} />}
      {showImport && <ImportPatrimonioModal onClose={() => setShowImport(false)} />}
      {qrItem && <PatrimonioQRCodeModal patrimonio={qrItem} onClose={() => setQrItem(null)} />}
      {showScanner && (
        <QRScannerModal
          onScan={(data) => {
            setShowScanner(false);
            const matchUrl = data.match(/\/asset\/([a-f0-9-]+)/i);
            const matchUuid = data.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
            const assetId = matchUrl?.[1] || matchUuid?.[1];
            if (assetId) {
              window.open(`/asset/${assetId}`, "_blank");
            } else {
              const found = patrimonios.find((p) => p.asset_tag === data || p.id === data);
              if (found) window.open(`/asset/${found.id}`, "_blank");
              else toast.info(`QR Code lido: ${data}`, { description: "Não foi possível encontrar o patrimônio correspondente." });
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
      {testQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setTestQrUrl(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <h3 className="text-lg font-bold text-foreground">QR Code de Teste</h3>
            <p className="text-sm text-muted-foreground">Aponte o scanner para este QR Code</p>
            <img src={testQrUrl} alt="QR Code de teste" className="mx-auto rounded-lg border border-border" />
            <button onClick={() => setTestQrUrl(null)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
