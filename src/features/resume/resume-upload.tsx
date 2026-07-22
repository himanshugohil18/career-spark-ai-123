import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, FileUp, RotateCw, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AIThinking } from "@/components/ai/ai-thinking";
import {
  uploadAndProcessResume,
  type UploadPhase,
  validateResumeFile,
  MAX_SIZE,
} from "./upload-processor";

const ease = [0.22, 1, 0.36, 1] as const;

type State =
  | { kind: "idle" }
  | { kind: "hover" }
  | { kind: "working"; phase: UploadPhase; fileName: string; progress: number }
  | { kind: "done"; fileName: string }
  | { kind: "error"; message: string; fileName?: string };

const PHASE_STEPS: Record<UploadPhase, string[]> = {
  validating: ["🛡️  Validating file…"],
  extracting: [
    "📄  Reading resume…",
    "🧹  Cleaning formatting…",
    "🔠  Normalizing text…",
  ],
  uploading: ["📤  Uploading securely…"],
  analyzing: [
    "🧠  Understanding experience…",
    "🔍  Finding skills…",
    "🏗️  Identifying projects…",
    "🎓  Analyzing education…",
    "📊  Scoring confidence…",
    "✨  Preparing review…",
  ],
  review: ["👀  Opening review…"],
  done: ["✅  Career Brain ready."],
};

export function ResumeUpload({
  onCompleted,
  compact = false,
}: {
  onCompleted?: () => void;
  compact?: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const handleFile = useCallback(
    async (file: File) => {
      const err = validateResumeFile(file);
      if (err) {
        const msg =
          err === "too_large"
            ? `Resume is too large. Max ${Math.round(MAX_SIZE / 1024 / 1024)} MB.`
            : err === "empty_file"
              ? "That file is empty."
              : "Only PDF and DOCX resumes are supported.";
        setState({ kind: "error", message: msg, fileName: file.name });
        toast.error(msg);
        return;
      }

      setState({
        kind: "working",
        phase: "validating",
        fileName: file.name,
        progress: 0,
      });

      try {
        const { resumeId } = await uploadAndProcessResume(file, {
          onPhase: (phase) =>
            setState((s) =>
              s.kind === "working" ? { ...s, phase } : s,
            ),
          onProgress: (uploaded, total) =>
            setState((s) =>
              s.kind === "working"
                ? { ...s, progress: total ? uploaded / total : 0 }
                : s,
            ),
        });
        setState({ kind: "done", fileName: file.name });
        toast.success("Resume parsed.", {
          description: "Review the extracted details, then approve to activate your Career Brain.",
        });
        onCompleted?.();
        void navigate({
          to: "/resume-review/$resumeId",
          params: { resumeId },
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Something went wrong.";
        setState({ kind: "error", message, fileName: file.name });
        toast.error("Upload failed", { description: message });
      }
    },
    [onCompleted, navigate],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState((s) => (s.kind === "idle" ? { kind: "hover" } : s));
  }, []);

  const onDragLeave = useCallback(() => {
    setState((s) => (s.kind === "hover" ? { kind: "idle" } : s));
  }, []);

  const reset = () => setState({ kind: "idle" });

  const isWorking = state.kind === "working";
  const isDone = state.kind === "done";
  const isError = state.kind === "error";

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "surface-elevated relative overflow-hidden rounded-2xl border border-dashed border-border/80 p-6 transition-colors md:p-10",
        state.kind === "hover" && "border-primary/60 bg-elevated",
        isDone && "border-success/50",
        isError && "border-danger/50",
        compact && "p-5 md:p-6",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      />

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      <AnimatePresence mode="wait">
        {(state.kind === "idle" || state.kind === "hover") && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease }}
            className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-elevated text-primary">
                <FileUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Step 1 · Activate your AI Workspace
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold tracking-tight md:text-2xl">
                  Activate your Career Brain
                </h3>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Drop a PDF or DOCX resume (max 10 MB). I'll structure your
                  experience, generate your Career DNA, and personalize the
                  entire workspace.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <Button
                variant="primary"
                size="lg"
                onClick={() => inputRef.current?.click()}
                className="shrink-0"
              >
                <Upload className="h-4 w-4" />
                Choose file
              </Button>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                or drag & drop
              </p>
            </div>
          </motion.div>
        )}

        {isWorking && (
          <motion.div
            key="working"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Processing
                </p>
                <p className="mt-1 truncate font-display text-lg font-semibold">
                  {state.fileName}
                </p>
              </div>
              <AIThinking
                size="sm"
                steps={PHASE_STEPS[state.phase]}
                interval={1400}
              />
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <motion.div
                className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                initial={{ width: 0 }}
                animate={{
                  width:
                    state.phase === "validating"
                      ? "8%"
                      : state.phase === "uploading"
                        ? `${Math.max(15, state.progress * 45)}%`
                        : state.phase === "extracting"
                          ? "30%"
                          : state.phase === "analyzing"
                            ? "80%"
                            : state.phase === "review"
                              ? "96%"
                              : "100%",
                }}
                transition={{ duration: 0.45, ease }}
              />
            </div>
          </motion.div>
        )}

        {isDone && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease }}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-success/40 bg-success/10 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-success">
                  Career Brain Active
                </p>
                <p className="mt-0.5 truncate font-display text-base font-semibold">
                  {state.fileName}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCw className="h-4 w-4" />
              Upload another
            </Button>
          </motion.div>
        )}

        {isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease }}
            className="flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-danger/40 bg-danger/10 text-danger">
                <X className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-danger">
                  Upload failed
                </p>
                <p className="mt-0.5 font-display text-base font-semibold">
                  {state.fileName ?? "Resume"}
                </p>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  {state.message}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <RotateCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
