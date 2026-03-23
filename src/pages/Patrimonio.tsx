import { useState } from "react";
import { Package, Search, Monitor, Laptop, Printer, Server, Calendar, User, MapPin, Plus, Pencil, Trash2, Wifi, Battery, Phone, MonitorSpeaker, HardDrive, Download, Upload, QrCode, ScanLine } from "lucide-react";
import { usePatrimonio, useDeletePatrimonio, type PatrimonioItem } from "@/hooks/usePatrimonio";
import { usePreventivas } from "@/hooks/usePreventivas";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import QRCode from "qrcode";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { Printer as PrinterIcon } from "lucide-react";
import NewPatrimonioModal from "@/components/NewPatrimonioModal";
import EditPatrimonioModal from "@/components/EditPatrimonioModal";
import ImportPatrimonioModal from "@/components/ImportPatrimonioModal";
import PatrimonioQRCodeModal from "@/components/PatrimonioQRCodeModal";
import QRScannerModal from "@/components/QRScannerModal";


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

export default function Patrimonio() {
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

  // Build maintenance history per asset_tag
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
    { label: "Total", value: patrimonios.length },
    { label: "Ativos", value: patrimonios.filter((p) => p.status === "Ativo").length },
    { label: "Em manutenção", value: patrimonios.filter((p) => p.status === "Em manutenção").length },
    { label: "Inativos", value: patrimonios.filter((p) => p.status === "Inativo" || p.status === "Descartado").length },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Patrimônio</h1>
            <p className="text-sm text-muted-foreground">Cadastro e histórico de todos os equipamentos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowScanner(true)}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ScanLine className="h-4 w-4" />
            Escanear
          </button>
          <button
            onClick={async () => {
              const item = patrimonios[0];
              if (!item) return toast.error("Cadastre um patrimônio primeiro.");
              const url = `${window.location.origin}/asset/${item.id}`;
              const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, errorCorrectionLevel: "H" });
              setTestQrUrl(dataUrl);
              toast.info(`QR Code de teste gerado para: ${item.asset_tag}`);
            }}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-primary/40 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <QrCode className="h-4 w-4" />
            QR Teste
          </button>
          <button
            onClick={() => {
              const BOM = "\uFEFF";
              const headers = "TAG,Tipo,Marca,Modelo,Nº Série,Setor,Responsável,Localização,Status,Observações";
              const rows = filtered.map((p) =>
                [p.asset_tag, p.equipment_type, p.brand, p.model, p.serial_number, p.sector, p.responsible, p.location, p.status, (p.notes || "").replace(/,/g, ";")]
                  .map((v) => `"${v || ""}"`)
                  .join(",")
              );
              const csv = BOM + [headers, ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "patrimonios.csv";
              a.click();
            }}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <button
            onClick={async () => {
              if (filtered.length === 0) return toast.error("Nenhum patrimônio para gerar QR Codes.");
              const toastId = toast.loading(`Gerando ${filtered.length} QR Codes...`);
              try {
                const zip = new JSZip();
                for (const item of filtered) {
                  const url = `${window.location.origin}/asset/${item.id}`;
                  const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: "H" });
                  const base64 = dataUrl.split(",")[1];
                  zip.file(`QR_${item.asset_tag.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`, base64, { base64: true });
                }
                const blob = await zip.generateAsync({ type: "blob" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "qrcodes_patrimonio.zip";
                a.click();
                URL.revokeObjectURL(a.href);
                toast.success(`${filtered.length} QR Codes gerados com sucesso!`, { id: toastId });
              } catch (e) {
                toast.error("Erro ao gerar QR Codes.", { id: toastId });
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <QrCode className="h-4 w-4" />
            QR Lote
          </button>
          <button
            onClick={async () => {
              if (filtered.length === 0) return toast.error("Nenhum patrimônio para gerar etiquetas.");
              const toastId = toast.loading(`Gerando PDF com ${filtered.length} etiquetas...`);
              try {
                // Pimaco 6182 layout: 2 columns x 7 rows per A4 page
                const doc = new jsPDF({ unit: "mm", format: "a4" });
                const pageW = 210, pageH = 297;
                const cols = 2, rows = 7;
                const labelW = 101.6, labelH = 33.9;
                const marginLeft = (pageW - cols * labelW) / 2;
                const marginTop = (pageH - rows * labelH) / 2;
                const padding = 3;

                for (let i = 0; i < filtered.length; i++) {
                  if (i > 0 && i % (cols * rows) === 0) doc.addPage();
                  const idx = i % (cols * rows);
                  const col = idx % cols;
                  const row = Math.floor(idx / cols);
                  const x = marginLeft + col * labelW;
                  const y = marginTop + row * labelH;

                  const item = filtered[i];
                  const qrUrl = `${window.location.origin}/asset/${item.id}`;
                  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 256, margin: 1, errorCorrectionLevel: "H" });

                  // Border
                  doc.setDrawColor(200);
                  doc.setLineWidth(0.2);
                  doc.rect(x, y, labelW, labelH);

                  // QR Code
                  const qrSize = labelH - padding * 2;
                  doc.addImage(qrDataUrl, "PNG", x + padding, y + padding, qrSize, qrSize);

                  // Text
                  const textX = x + padding + qrSize + 3;
                  const maxTextW = labelW - qrSize - padding * 2 - 3;

                  doc.setFontSize(11);
                  doc.setFont("helvetica", "bold");
                  doc.text(item.asset_tag, textX, y + padding + 4, { maxWidth: maxTextW });

                  doc.setFontSize(7.5);
                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(100);
                  let textY = y + padding + 9;

                  doc.text(item.equipment_type, textX, textY, { maxWidth: maxTextW });
                  textY += 4;

                  if (item.brand || item.model) {
                    doc.text([item.brand, item.model].filter(Boolean).join(" "), textX, textY, { maxWidth: maxTextW });
                    textY += 4;
                  }
                  if (item.serial_number) {
                    doc.text(`S/N: ${item.serial_number}`, textX, textY, { maxWidth: maxTextW });
                    textY += 4;
                  }
                  if (item.sector) {
                    doc.text(item.sector, textX, textY, { maxWidth: maxTextW });
                    textY += 4;
                  }
                  if (item.responsible && textY < y + labelH - padding) {
                    doc.text(item.responsible, textX, textY, { maxWidth: maxTextW });
                  }

                  doc.setTextColor(0);
                }

                doc.save("etiquetas_patrimonio.pdf");
                toast.success(`PDF gerado com ${filtered.length} etiquetas!`, { id: toastId });
              } catch (e) {
                toast.error("Erro ao gerar PDF.", { id: toastId });
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <PrinterIcon className="h-4 w-4" />
            Etiquetas PDF
          </button>
          {canEdit && (
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importar
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Novo Patrimônio
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar patrimônio, marca, modelo..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
        >
          <option value="Todos">Todos os Tipos</option>
          {uniqueTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground"
        >
          <option value="Todos">Todos Status</option>
          <option value="Ativo">Ativo</option>
          <option value="Em manutenção">Em manutenção</option>
          <option value="Inativo">Inativo</option>
          <option value="Descartado">Descartado</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 flex items-center justify-center rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando patrimônios...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center rounded-xl border border-border bg-card gap-2">
          <Package className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum patrimônio encontrado.</p>
          {canEdit && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Cadastrar primeiro patrimônio
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const history = maintenanceMap.get(item.asset_tag) || [];
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.asset_tag} className="h-11 w-11 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {typeIcons[item.equipment_type] || <HardDrive className="h-5 w-5" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono font-semibold text-foreground">{item.asset_tag}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.equipment_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[item.status] || "bg-muted text-muted-foreground"}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {(item.brand || item.model) && (
                        <span>{[item.brand, item.model].filter(Boolean).join(" ")}</span>
                      )}
                      {item.sector && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.sector}</span>
                      )}
                      {item.responsible && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{item.responsible}</span>
                      )}
                      {item.location && (
                        <span className="text-muted-foreground">📍 {item.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">{history.length} manutenções</p>
                    {history.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Última: {format(new Date(history.sort((a, b) => b.execution_date.localeCompare(a.execution_date))[0].execution_date), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/30 space-y-4">
                    {/* Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      {item.serial_number && (
                        <div>
                          <p className="text-xs text-muted-foreground">Nº Série</p>
                          <p className="font-mono text-foreground">{item.serial_number}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Cadastrado em</p>
                        <p className="text-foreground">{format(new Date(item.created_at), "dd/MM/yyyy")}</p>
                      </div>
                      {item.notes && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Observações</p>
                          <p className="text-foreground">{item.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrItem(item);
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-input text-foreground hover:bg-muted transition-colors"
                        >
                          <QrCode className="h-3 w-3 inline mr-1" />
                          QR Code
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-input text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-3 w-3 inline mr-1" />
                          Editar
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Tem certeza que deseja excluir este patrimônio?")) {
                                deletePatrimonio.mutate(item.id);
                              }
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3 w-3 inline mr-1" />
                            Excluir
                          </button>
                        )}
                      </div>
                    )}

                    {/* Maintenance history */}
                    {history.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Histórico de Manutenções</p>
                        <div className="space-y-2">
                          {history
                            .sort((a, b) => b.execution_date.localeCompare(a.execution_date))
                            .slice(0, 5)
                            .map((h) => {
                              const vals = Object.values(h.checklist);
                              const done = vals.filter(Boolean).length;
                              return (
                                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                                  <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{format(new Date(h.execution_date), "dd/MM/yyyy")}</p>
                                      <p className="text-xs text-muted-foreground">Técnico: {h.creatorName || "—"}</p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-medium text-foreground">{done}/{vals.length} itens</p>
                                </div>
                              );
                            })}
                          {history.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center">+ {history.length - 5} manutenções anteriores</p>
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
            // Try to extract asset ID from URL like /asset/{id}
            const matchUrl = data.match(/\/asset\/([a-f0-9-]+)/i);
            // Also try plain UUID
            const matchUuid = data.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
            // Also try asset_tag directly
            const assetId = matchUrl?.[1] || matchUuid?.[1];
            
            if (assetId) {
              window.open(`/asset/${assetId}`, "_blank");
            } else {
              // Try to find by asset_tag in current data
              const found = patrimonios.find(p => p.asset_tag === data || p.id === data);
              if (found) {
                window.open(`/asset/${found.id}`, "_blank");
              } else {
                toast.info(`QR Code lido: ${data}`, { description: "Não foi possível encontrar o patrimônio correspondente." });
              }
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
      {testQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setTestQrUrl(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-bold text-foreground">QR Code de Teste</h3>
            <p className="text-sm text-muted-foreground">Aponte o scanner para este QR Code</p>
            <img src={testQrUrl} alt="QR Code de teste" className="mx-auto rounded-lg border border-border" />
            <button onClick={() => setTestQrUrl(null)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
