import { useEffect, useRef, useState } from "react";
import { X, ScanLine, Camera } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScannerModal({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const regionId = "qr-reader-region";
    let isRunning = false;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            isRunning = false;
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {} // ignore scan failures
        );
        isRunning = true;
      } catch (err: any) {
        setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      }
    };

    startScanner();

    return () => {
      if (isRunning && scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        isRunning = false;
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Escanear QR Code</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-8 space-y-3">
              <Camera className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground">
                No PC, verifique se a câmera está conectada e as permissões estão liberadas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                id="qr-reader-region"
                ref={containerRef}
                className="rounded-xl overflow-hidden bg-black"
              />
              <p className="text-xs text-muted-foreground text-center">
                Aponte a câmera para o QR Code do patrimônio
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
