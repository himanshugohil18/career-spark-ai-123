import { useEffect, useRef, useState } from "react";
import { Mic, Square, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Purely optional, purely local practice recorder. Nothing is uploaded or
 * persisted — audio stays in the browser tab and is discarded when the
 * recording stops or the component unmounts. Feature-detects
 * navigator.mediaDevices and gracefully hides itself if unavailable.
 */
export function WaveformRecorder() {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error("Web Audio unavailable");
      const ctx: AudioContext = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const canvas = canvasRef.current;
      const draw = () => {
        rafRef.current = requestAnimationFrame(draw);
        if (!canvas) return;
        const ctx2d = canvas.getContext("2d");
        if (!ctx2d) return;
        analyser.getByteTimeDomainData(buffer);

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx2d.clearRect(0, 0, w, h);

        const style = getComputedStyle(canvas);
        const stroke = style.getPropertyValue("--wave-color") || "currentColor";

        ctx2d.lineWidth = 2;
        ctx2d.strokeStyle = stroke.trim();
        ctx2d.beginPath();
        const slice = w / buffer.length;
        let x = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
          x += slice;
        }
        ctx2d.stroke();
      };
      draw();
      setRecording(true);
    } catch (e) {
      setError("Microphone access was blocked or unavailable.");
      setSupported(!!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function");
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    setRecording(false);
  }

  if (!supported) return null;

  return (
    <div className="w-full rounded-xl border border-border bg-elevated/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Local only · never leaves your browser
        </div>
        <button
          type="button"
          onClick={() => (recording ? stop() : start())}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition",
            recording
              ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "border-border bg-background hover:border-primary/40",
          )}
        >
          {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {recording ? "Stop" : "Practice out loud"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <canvas
        ref={canvasRef}
        className="mt-3 h-16 w-full text-primary [--wave-color:var(--color-primary)]"
        aria-hidden="true"
      />
      {!recording && !error && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Optional: speak your answer aloud and watch the waveform to gauge your pacing. Nothing is recorded to disk.
        </p>
      )}
    </div>
  );
}
