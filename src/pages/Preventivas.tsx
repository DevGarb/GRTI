import { useState } from "react";
import { Plus, Wrench, Monitor, Laptop, Printer, Server, Search, Download, Filter, CheckCircle2, XCircle, AlertTriangle, Clock, Settings, ChevronDown, Camera, BarChart3 } from "lucide-react";
import NewPreventivaModal from "@/components/NewPreventivaModal";
import { usePreventivas, useOverdueEquipment, useMaintenanceIntervals, useUpdateInterval } from "@/hooks/usePreventivas";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import OverdueAlerts from "@/components/preventivas/OverdueAlerts";
import PreventivasTable from "@/components/preventivas/PreventivasTable";
import EquipmentTable from "@/components/preventivas/EquipmentTable";
import IntervalConfig from "@/components/preventivas/IntervalConfig";
import MonthlyReport from "@/components/preventivas/MonthlyReport";


const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const typeIcons: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-4 w-4" />,
  Notebook: <Laptop className="h-4 w-4" />,
  Impressora: <Printer className="h-4 w-4" />,
  Servidor: <Server className="h-4 w-4" />,
};

export default function Preventivas() {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"registros" | "equipamentos" | "configuracao" | "relatorio">("registros");
  const [search, setSearch] = useState("");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedType, setSelectedType] = useState("Todos Tipos");
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const { data: preventivas = [], isLoading } = usePreventivas(selectedMonth, selectedYear, selectedType);
  const { data: overdueEquipment = [] } = useOverdueEquipment();
  const { data: intervals = [] } = useMaintenanceIntervals();
  const updateInterval = useUpdateInterval();

  // Stats
  const totalPreventivas = preventivas.length;
  const completedChecks = preventivas.filter((p) => {
    const vals = Object.values(p.checklist);
    return vals.length > 0 && vals.every(Boolean);
  }).length;
  const uniqueEquipment = new Set(preventivas.map((p) => p.asset_tag)).size;
  const overdueCount = overdueEquipment.filter((e) => e.status === "overdue").length;
  const warningCount = overdueEquipment.filter((e) => e.status === "warning").length;

  // Equipment map
  const equipmentMap = new Map<string, { type: string; tag: string; count: number; lastDate: string; sector: string; responsible: string }>();
  preventivas.forEach((p) => {
    const existing = equipmentMap.get(p.asset_tag);
    if (existing) {
      existing.count++;
      if (p.execution_date > existing.lastDate) {
        existing.lastDate = p.execution_date;
        existing.sector = p.sector || existing.sector;
        existing.responsible = p.responsible || existing.responsible;
      }
    } else {
      equipmentMap.set(p.asset_tag, { type: p.equipment_type, tag: p.asset_tag, count: 1, lastDate: p.execution_date, sector: p.sector || "", responsible: p.responsible || "" });
    }
  });

  // Search filter
  const filteredPreventivas = search
    ? preventivas.filter((p) =>
        p.asset_tag.toLowerCase().includes(search.toLowerCase()) ||
        p.equipment_type.toLowerCase().includes(search.toLowerCase()) ||
        (p.creatorName || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.sector || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.responsible || "").toLowerCase().includes(search.toLowerCase())
      )
    : preventivas;

  const filteredEquipment = search
    ? [...equipmentMap.values()].filter((eq) =>
        eq.tag.toLowerCase().includes(search.toLowerCase()) ||
        eq.type.toLowerCase().includes(search.toLowerCase())
      )
    : [...equipmentMap.values()];

  // Export CSV
  const handleExport = () => {
    const headers = ["Data,Tipo,Patrimônio,Checklist,Técnico,Observações"];
    const rows = preventivas.map((p) => {
      const checked = Object.values(p.checklist).filter(Boolean).length;
      const total = Object.keys(p.checklist).length;
      return `${format(new Date(p.execution_date), "dd/MM/yyyy")},${p.equipment_type},${p.asset_tag},${checked}/${total},${p.creatorName || ""},${(p.notes || "").replace(/,/g, ";")}`;
    });
    const csv = [...headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `preventivas_${months[selectedMonth]}_${selectedYear}.csv`;
    a.click();
  };

  const stats = [
    { label: "Total Preventivas", value: totalPreventivas, icon: <Wrench className="h-5 w-5" />, color: "text-primary" },
    { label: "Checklist Completo", value: completedChecks, icon: <CheckCircle2 className="h-5 w-5" />, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Equipamentos", value: uniqueEquipment, icon: <Monitor className="h-5 w-5" />, color: "text-blue-600 dark:text-blue-400" },
    { label: "A Vencer (≤15d)", value: warningCount, icon: <Clock className="h-5 w-5" />, color: warningCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
    { label: "Vencidas", value: overdueCount, icon: <AlertTriangle className="h-5 w-5" />, color: overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manutenções Preventivas</h1>
            <p className="text-sm text-muted-foreground">Acompanhamento e registro de preventivas em equipamentos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-input text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Nova Preventiva
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-2">
              <span className={s.color}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overdue Alerts */}
      <OverdueAlerts overdueEquipment={overdueEquipment} onNewPreventiva={() => setShowModal(true)} />

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por patrimônio, tipo ou técnico..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground">
          {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground">
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground">
          <option>Todos Tipos</option>
          <option>Desktop</option>
          <option>Notebook</option>
          <option>Impressora</option>
          <option>Servidor</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: "registros" as const, label: "Registros", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
          { key: "equipamentos" as const, label: "Equipamentos", icon: <Monitor className="h-3.5 w-3.5" /> },
          { key: "relatorio" as const, label: "Relatório", icon: <BarChart3 className="h-3.5 w-3.5" /> },
          ...(isAdmin ? [{ key: "configuracao" as const, label: "Intervalos", icon: <Settings className="h-3.5 w-3.5" /> }] : []),
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.key === "registros" && (
              <span className="ml-1 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{filteredPreventivas.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 flex items-center justify-center rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando preventivas...</p>
          </div>
        </div>
      ) : activeTab === "registros" ? (
        <PreventivasTable preventivas={filteredPreventivas} />
      ) : activeTab === "equipamentos" ? (
        <EquipmentTable equipment={filteredEquipment} statusData={overdueEquipment} />
      ) : activeTab === "relatorio" ? (
        <MonthlyReport preventivas={preventivas} monthLabel={months[selectedMonth]} year={selectedYear} />
      ) : (
        <IntervalConfig intervals={intervals} updateInterval={updateInterval} />
      )}

      {showModal && <NewPreventivaModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
