import { useEffect, useState, useRef } from "react";
import { X, Download, QrCode, Monitor, Laptop, Printer, Server, Wifi, Battery, Phone, MonitorSpeaker, HardDrive, MapPin, User, Hash, Building2 } from "lucide-react";
import QRCode from "qrcode";
import type { PatrimonioItem } from "@/hooks/usePatrimonio";

interface Props {
  patrimonio: PatrimonioItem;
  onClose: () => void;
}

type LabelSize = "12x40" | "15x30" | "12x22";

const labelDimensions: Record<LabelSize, { w: string; h: string; qr: string; fontSize: string }> = {
  "12x40": { w: "320px", h: "96px", qr: "72px", fontSize: "14px" },
  "15x30": { w: "240px", h: "120px", qr: "80px", fontSize: "13px" },
  "12x22": { w: "176px", h: "96px", qr: "64px", fontSize: "11px" },
};

export default function PatrimonioQRCodeModal({ patrimonio, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"qr" | "card">("qr");
  const [labelSize, setLabelSize] = useState<LabelSize>("12x40");
  const cardRef = useRef<HTMLDivElement>(null);

  const assetUrl = `${window.location.origin}/asset/${patrimonio.id}`;

  useEffect(() => {
    QRCode.toDataURL(assetUrl, {
      width: 1024,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
      rendererOpts: { quality: 1 },
    }).then(setQrDataUrl);
  }, [assetUrl]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR_${patrimonio.asset_tag}.png`;
    a.click();
  };

  const downloadCard = () => {
    if (!cardRef.current) return;
    import("html2canvas").then(({ default: html2canvas }) => {
      html2canvas(cardRef.current!, { scale: 4, backgroundColor: "#ffffff" }).then((canvas) => {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `Etiqueta_${patrimonio.asset_tag}_${labelSize}.png`;
        a.click();
      });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">QR Code — {patrimonio.asset_tag}</h2>
              <p className="text-xs text-muted-foreground">Escaneie para visualizar os dados do patrimônio</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "qr" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            QR Code
          </button>
          <button
            onClick={() => setActiveTab("card")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "card" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Etiqueta Niimbot D110
          </button>
        </div>

        <div className="p-5 space-y-4">
          {activeTab === "qr" ? (
            <div className="flex flex-col items-center gap-4">
              {qrDataUrl && (
                <div className="bg-white p-4 rounded-xl shadow-inner">
                  <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
                </div>
              )}
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-foreground">{patrimonio.asset_tag}</p>
                <p className="text-xs text-muted-foreground">
                  {patrimonio.equipment_type} {patrimonio.brand && `• ${patrimonio.brand}`} {patrimonio.model && patrimonio.model}
                </p>
              </div>
              <button
                onClick={downloadQR}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Baixar QR Code (PNG)
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* Label size selector */}
              <div className="flex gap-2">
                {(["12x40", "15x30", "12x22"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setLabelSize(size)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      labelSize === size
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {size}mm
                  </button>
                ))}
              </div>

              {/* Niimbot D110 label preview */}
              <div className="bg-muted/50 rounded-xl p-6 flex items-center justify-center">
                <div
                  ref={cardRef}
                  style={{
                    width: labelDimensions[labelSize].w,
                    height: labelDimensions[labelSize].h,
                    backgroundColor: "#ffffff",
                    display: "flex",
                    flexDirection: labelSize === "12x40" ? "row" : "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: labelSize === "12x22" ? "2px" : "6px",
                    padding: labelSize === "12x22" ? "4px" : "6px",
                    fontFamily: "Arial, Helvetica, sans-serif",
                    color: "#000000",
                    boxSizing: "border-box" as const,
                    border: "1px solid #e0e0e0",
                  }}
                >
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="QR"
                      style={{
                        width: labelDimensions[labelSize].qr,
                        height: labelDimensions[labelSize].qr,
                        imageRendering: "pixelated" as const,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: labelSize === "12x40" ? "flex-start" : "center",
                      justifyContent: "center",
                      lineHeight: 1.15,
                      minWidth: 0,
                      gap: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: labelDimensions[labelSize].fontSize,
                        fontWeight: 900,
                        letterSpacing: "-0.02em",
                        whiteSpace: "nowrap",
                        color: "#000000",
                        lineHeight: 1,
                      }}
                    >
                      {patrimonio.asset_tag}
                    </span>
                    {labelSize !== "12x22" && (
                      <span
                        style={{
                          fontSize: `${parseInt(labelDimensions[labelSize].fontSize) - 3}px`,
                          color: "#555555",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: labelSize === "12x40" ? "140px" : "100%",
                          lineHeight: 1.2,
                          display: "block",
                        }}
                      >
                        {patrimonio.equipment_type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground text-center max-w-xs">
                Otimizada para <strong>Niimbot D110</strong> — etiqueta {labelSize}mm. Imagem gerada em alta resolução (4x) para impressão térmica nítida.
              </p>

              <button
                onClick={downloadCard}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Baixar Etiqueta (PNG)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
