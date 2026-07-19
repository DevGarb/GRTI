import { motion, useReducedMotion } from "framer-motion";

/**
 * Cinematic dark-tech backdrop: drifting aurora blobs in the brand palette,
 * a fine engineering grid and a vignette. Accepts an optional `videoSrc`
 * (e.g. um loop gerado no Higgsfield) que substitui a aurora procedural.
 */
export default function AuroraBackground({ videoSrc }: { videoSrc?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden bg-[hsl(220,45%,4%)]" aria-hidden="true">
      {videoSrc ? (
        <video
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
      ) : (
        <>
          <motion.div
            className="absolute -top-[20%] -left-[10%] h-[70vh] w-[70vh] rounded-full blur-[120px]"
            style={{ background: "hsl(207 100% 26% / 0.55)" }}
            animate={reduceMotion ? undefined : { x: [0, 60, -20, 0], y: [0, 40, 80, 0], scale: [1, 1.15, 0.95, 1] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-[30%] -right-[15%] h-[60vh] w-[60vh] rounded-full blur-[130px]"
            style={{ background: "hsl(188 95% 40% / 0.28)" }}
            animate={reduceMotion ? undefined : { x: [0, -70, 30, 0], y: [0, -50, 20, 0], scale: [1, 0.9, 1.1, 1] }}
            transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-[25%] left-[25%] h-[55vh] w-[55vh] rounded-full blur-[140px]"
            style={{ background: "hsl(258 88% 45% / 0.22)" }}
            animate={reduceMotion ? undefined : { x: [0, 50, -60, 0], y: [0, -40, -10, 0] }}
            transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {/* Fine engineering grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(210 40% 60% / 0.07) 1px, transparent 1px), linear-gradient(90deg, hsl(210 40% 60% / 0.07) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 40%, black 40%, transparent 100%)",
        }}
      />

      {/* Vignette to keep edges rich and focus the content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 55%, hsl(220 45% 3% / 0.85) 100%)",
        }}
      />
    </div>
  );
}
