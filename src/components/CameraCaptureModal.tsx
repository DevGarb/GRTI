import { useRef, useState, useCallback } from "react";
import { X, Camera, RotateCcw, Check } from "lucide-react";

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCaptureModal({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStarted(true);
    } catch {
      setError("Não foi possível acessar a câmera.");
    }
  }, []);

  // Start camera on mount
  useState(() => { startCamera(); });

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhoto(dataUrl);

    // Stop stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const retake = async () => {
    setPhoto(null);
    await startCamera();
  };

  const confirm = () => {
    if (!photo) return;
    // Convert data URL to File
    fetch(photo)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      });
  };

  // Cleanup on unmount
  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={cleanup}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Capturar Foto</h2>
          </div>
          <button onClick={cleanup} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error ? (
            <div className="text-center py-8 space-y-2">
              <Camera className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground">Verifique as permissões da câmera no navegador.</p>
            </div>
          ) : photo ? (
            <div className="space-y-3">
              <img src={photo} alt="Captured" className="w-full rounded-xl" />
              <div className="flex gap-2">
                <button
                  onClick={retake}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Tirar outra
                </button>
                <button
                  onClick={confirm}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Check className="h-4 w-4" />
                  Usar esta foto
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              {started && (
                <button
                  onClick={takePhoto}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Camera className="h-4 w-4" />
                  Capturar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
