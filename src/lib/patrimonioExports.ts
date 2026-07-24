import QRCode from "qrcode";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import type { PatrimonioItem } from "@/hooks/usePatrimonio";

export const assetUrl = (id: string) => `${window.location.origin}/asset/${id}`;

/** QR Code de teste do primeiro patrimônio. Retorna dataURL ou null. */
export async function generateTestQr(items: PatrimonioItem[]): Promise<string | null> {
  const item = items[0];
  if (!item) {
    toast.error("Cadastre um patrimônio primeiro.");
    return null;
  }
  const dataUrl = await QRCode.toDataURL(assetUrl(item.id), { width: 300, margin: 2, errorCorrectionLevel: "H" });
  toast.info(`QR Code de teste gerado para: ${item.asset_tag}`);
  return dataUrl;
}

/** Exporta a lista filtrada em CSV (com BOM p/ Excel). */
export function exportPatrimonioCsv(items: PatrimonioItem[]) {
  const BOM = "﻿";
  const headers = "TAG,Tipo,Marca,Modelo,Nº Série,Setor,Responsável,Localização,Status,Observações";
  const rows = items.map((p) =>
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
  URL.revokeObjectURL(url);
}

/** Gera um .zip com um QR Code PNG por patrimônio da lista filtrada. */
export async function exportPatrimonioQrZip(items: PatrimonioItem[]) {
  if (items.length === 0) return toast.error("Nenhum patrimônio para gerar QR Codes.");
  const toastId = toast.loading(`Gerando ${items.length} QR Codes...`);
  try {
    const zip = new JSZip();
    for (const item of items) {
      const dataUrl = await QRCode.toDataURL(assetUrl(item.id), { width: 512, margin: 2, errorCorrectionLevel: "H" });
      const base64 = dataUrl.split(",")[1];
      zip.file(`QR_${item.asset_tag.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qrcodes_patrimonio.zip";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`${items.length} QR Codes gerados com sucesso!`, { id: toastId });
  } catch {
    toast.error("Erro ao gerar QR Codes.", { id: toastId });
  }
}

/** Gera um PDF de etiquetas (Pimaco 6182: 2 colunas x 7 linhas por página A4). */
export async function exportPatrimonioLabelsPdf(items: PatrimonioItem[]) {
  if (items.length === 0) return toast.error("Nenhum patrimônio para gerar etiquetas.");
  const toastId = toast.loading(`Gerando PDF com ${items.length} etiquetas...`);
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210, pageH = 297;
    const cols = 2, rows = 7;
    const labelW = 101.6, labelH = 33.9;
    const marginLeft = (pageW - cols * labelW) / 2;
    const marginTop = (pageH - rows * labelH) / 2;
    const padding = 3;

    for (let i = 0; i < items.length; i++) {
      if (i > 0 && i % (cols * rows) === 0) doc.addPage();
      const idx = i % (cols * rows);
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = marginLeft + col * labelW;
      const y = marginTop + row * labelH;

      const item = items[i];
      const qrDataUrl = await QRCode.toDataURL(assetUrl(item.id), { width: 256, margin: 1, errorCorrectionLevel: "H" });

      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.rect(x, y, labelW, labelH);

      const qrSize = labelH - padding * 2;
      doc.addImage(qrDataUrl, "PNG", x + padding, y + padding, qrSize, qrSize);

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
    toast.success(`PDF gerado com ${items.length} etiquetas!`, { id: toastId });
  } catch {
    toast.error("Erro ao gerar PDF.", { id: toastId });
  }
}
